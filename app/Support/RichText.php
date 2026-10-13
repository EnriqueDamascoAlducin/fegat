<?php

namespace App\Support;

use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

/**
 * HTML que produce el editor con formato del panel. Todo lo que se guarda
 * pasa por aquí, así que el sitio público puede mostrarlo sin escaparlo.
 */
final class RichText
{
    /** Etiquetas sin atributos. */
    private const PLAIN_ELEMENTS = ['br', 'strong', 'em', 'u', 's', 'mark', 'ul', 'ol', 'li', 'blockquote', 'hr'];

    /** Etiquetas que pueden llevar `style` (alineación o color), filtrado después. */
    private const STYLED_ELEMENTS = ['p', 'h2', 'h3', 'h4', 'span'];

    private static ?HtmlSanitizer $sanitizer = null;

    /**
     * Deja solo las etiquetas que el editor ofrece; scripts, atributos como
     * onclick y cualquier estilo que no sea alineación o color se eliminan.
     */
    public static function sanitize(?string $html): string
    {
        self::$sanitizer ??= new HtmlSanitizer(self::config());

        return trim(self::filterStyles(self::$sanitizer->sanitize($html ?? '')));
    }

    /**
     * Texto sin formato del contenido ya saneado, para resúmenes.
     */
    public static function plainText(?string $html): string
    {
        // Un espacio donde termina cada bloque, para que no se peguen las palabras.
        $spaced = preg_replace('/<\/(p|h[2-4]|li|blockquote)>|<br\s*\/?>/i', '$0 ', self::sanitize($html)) ?? '';

        return trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($spaced))) ?? '');
    }

    public static function isBlank(?string $html): bool
    {
        $html ??= '';

        return ! str_contains($html, '<img') && trim(html_entity_decode(strip_tags($html))) === '';
    }

    private static function config(): HtmlSanitizerConfig
    {
        $config = new HtmlSanitizerConfig;

        foreach (self::PLAIN_ELEMENTS as $element) {
            $config = $config->allowElement($element);
        }

        foreach (self::STYLED_ELEMENTS as $element) {
            $config = $config->allowElement($element, ['style']);
        }

        return $config
            ->allowElement('a', ['href'])
            ->allowLinkSchemes(['https', 'http', 'mailto', 'tel'])
            ->forceAttribute('a', 'target', '_blank')
            ->forceAttribute('a', 'rel', 'noopener noreferrer')
            ->allowElement('img', ['src', 'alt'])
            ->allowMediaSchemes(['https', 'http'])
            ->allowRelativeMedias()
            ->withMaxInputLength(100000);
    }

    /**
     * Del atributo `style` solo sobreviven `text-align` y `color` con valores simples.
     */
    private static function filterStyles(string $html): string
    {
        return preg_replace_callback('/\sstyle="([^"]*)"/i', function (array $match) {
            $kept = [];

            foreach (explode(';', html_entity_decode($match[1])) as $declaration) {
                if (preg_match('/^\s*(text-align)\s*:\s*(left|center|right|justify)\s*$/i', $declaration, $parts)
                    || preg_match('/^\s*(color)\s*:\s*(#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\))\s*$/i', $declaration, $parts)) {
                    $kept[] = strtolower($parts[1]).': '.strtolower($parts[2]);
                }
            }

            return $kept ? ' style="'.implode('; ', $kept).'"' : '';
        }, $html) ?? '';
    }
}
