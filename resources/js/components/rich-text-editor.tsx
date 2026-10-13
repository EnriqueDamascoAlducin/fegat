import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    Heading2,
    Heading3,
    Heading4,
    Highlighter,
    ImagePlus,
    Italic,
    Link,
    List,
    ListOrdered,
    Minus,
    Palette,
    Quote,
    Redo2,
    RemoveFormatting,
    Strikethrough,
    Underline,
    Undo2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { cn } from '@/lib/utils';

const ALIGNMENTS: { value: string; icon: LucideIcon; label: string }[] = [
    { value: 'left', icon: AlignLeft, label: 'Alinear a la izquierda' },
    { value: 'center', icon: AlignCenter, label: 'Centrar' },
    { value: 'right', icon: AlignRight, label: 'Alinear a la derecha' },
    { value: 'justify', icon: AlignJustify, label: 'Justificar' },
];

const HEADINGS: { level: 2 | 3 | 4; icon: LucideIcon; label: string }[] = [
    { level: 2, icon: Heading2, label: 'Título grande' },
    { level: 3, icon: Heading3, label: 'Título mediano' },
    { level: 4, icon: Heading4, label: 'Título pequeño' },
];

function ToolbarButton({
    icon: Icon,
    label,
    active = false,
    disabled = false,
    onClick,
}: {
    icon: LucideIcon;
    label: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent disabled:opacity-40',
                active && 'bg-accent text-accent-foreground',
            )}
        >
            <Icon className="size-4" />
        </button>
    );
}

function Divider() {
    return <span className="mx-1 w-px self-stretch bg-border" />;
}

/** Laravel valida las peticiones con el token que deja en esta cookie. */
function csrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Editor con formato (Tiptap). Envía su HTML en un campo oculto llamado
 * `name`, así funciona dentro de un <Form> como cualquier otro campo.
 */
export default function RichTextEditor({
    id,
    name,
    defaultValue = '',
    uploadUrl,
}: {
    id: string;
    name: string;
    defaultValue?: string;
    /** Si se indica, aparece el botón para insertar imágenes subiéndolas ahí. */
    uploadUrl?: string;
}) {
    const [html, setHtml] = useState(defaultValue);
    const [uploading, setUploading] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3, 4] },
                code: false,
                codeBlock: false,
                link: {
                    openOnClick: false,
                    autolink: true,
                    defaultProtocol: 'https',
                },
            }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle,
            Color,
            Highlight,
            Image,
        ],
        content: defaultValue,
        shouldRerenderOnTransaction: true,
        editorProps: {
            attributes: {
                id,
                role: 'textbox',
                'aria-multiline': 'true',
                class: 'rich-text min-h-48 px-3 py-2 text-sm outline-none',
            },
        },
        onUpdate: ({ editor: current }) =>
            setHtml(current.isEmpty ? '' : current.getHTML()),
    });

    if (!editor) {
        return null;
    }

    const editLink = () => {
        const current = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt(
            'Dirección del enlace (déjala vacía para quitarlo)',
            current ?? 'https://',
        );

        if (url === null) {
            return;
        }

        const chain = editor.chain().focus().extendMarkRange('link');

        if (['', 'https://'].includes(url.trim())) {
            chain.unsetLink().run();
        } else {
            chain.setLink({ href: url.trim() }).run();
        }
    };

    const insertImage = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file || !uploadUrl) {
            return;
        }

        const body = new FormData();
        body.append('image', file);
        setUploading(true);

        try {
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body,
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': csrfToken(),
                },
            });
            const data = (await response.json()) as {
                url?: string;
                message?: string;
            };

            if (!response.ok || !data.url) {
                throw new Error(data.message ?? 'No se pudo subir la imagen.');
            }

            editor.chain().focus().setImage({ src: data.url, alt: '' }).run();
        } catch (error) {
            window.alert(
                error instanceof Error
                    ? error.message
                    : 'No se pudo subir la imagen.',
            );
        } finally {
            setUploading(false);
        }
    };

    const currentColor =
        (editor.getAttributes('textStyle').color as string | undefined) ??
        '#6c0ea3';

    return (
        <div className="rounded-md border border-input shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-input p-1">
                {HEADINGS.map(({ level, icon, label }) => (
                    <ToolbarButton
                        key={level}
                        icon={icon}
                        label={label}
                        active={editor.isActive('heading', { level })}
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleHeading({ level })
                                .run()
                        }
                    />
                ))}
                <Divider />
                <ToolbarButton
                    icon={Bold}
                    label="Negrita"
                    active={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                />
                <ToolbarButton
                    icon={Italic}
                    label="Cursiva"
                    active={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                />
                <ToolbarButton
                    icon={Underline}
                    label="Subrayado"
                    active={editor.isActive('underline')}
                    onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                    }
                />
                <ToolbarButton
                    icon={Strikethrough}
                    label="Tachado"
                    active={editor.isActive('strike')}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                />
                <ToolbarButton
                    icon={Highlighter}
                    label="Resaltar"
                    active={editor.isActive('highlight')}
                    onClick={() =>
                        editor.chain().focus().toggleHighlight().run()
                    }
                />
                <label
                    title="Color del texto"
                    className="relative flex size-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent"
                >
                    <Palette className="size-4" />
                    <span
                        className="absolute inset-x-1.5 bottom-1 h-0.5 rounded"
                        style={{ backgroundColor: currentColor }}
                    />
                    <input
                        type="color"
                        aria-label="Color del texto"
                        value={currentColor}
                        onChange={(event) =>
                            editor
                                .chain()
                                .focus()
                                .setColor(event.target.value)
                                .run()
                        }
                        className="absolute inset-0 cursor-pointer opacity-0"
                    />
                </label>
                <Divider />
                {ALIGNMENTS.map(({ value, icon, label }) => (
                    <ToolbarButton
                        key={value}
                        icon={icon}
                        label={label}
                        active={editor.isActive({ textAlign: value })}
                        onClick={() =>
                            editor.chain().focus().setTextAlign(value).run()
                        }
                    />
                ))}
                <Divider />
                <ToolbarButton
                    icon={List}
                    label="Lista con viñetas"
                    active={editor.isActive('bulletList')}
                    onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                    }
                />
                <ToolbarButton
                    icon={ListOrdered}
                    label="Lista numerada"
                    active={editor.isActive('orderedList')}
                    onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                    }
                />
                <ToolbarButton
                    icon={Quote}
                    label="Cita"
                    active={editor.isActive('blockquote')}
                    onClick={() =>
                        editor.chain().focus().toggleBlockquote().run()
                    }
                />
                <ToolbarButton
                    icon={Minus}
                    label="Línea divisoria"
                    onClick={() =>
                        editor.chain().focus().setHorizontalRule().run()
                    }
                />
                <Divider />
                <ToolbarButton
                    icon={Link}
                    label="Enlace"
                    active={editor.isActive('link')}
                    onClick={editLink}
                />
                {uploadUrl && (
                    <>
                        <ToolbarButton
                            icon={ImagePlus}
                            label={
                                uploading
                                    ? 'Subiendo imagen…'
                                    : 'Insertar imagen'
                            }
                            disabled={uploading}
                            onClick={() => fileInput.current?.click()}
                        />
                        <input
                            ref={fileInput}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(event) => void insertImage(event)}
                        />
                    </>
                )}
                <Divider />
                <ToolbarButton
                    icon={RemoveFormatting}
                    label="Quitar formato"
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .unsetAllMarks()
                            .clearNodes()
                            .unsetTextAlign()
                            .run()
                    }
                />
                <ToolbarButton
                    icon={Undo2}
                    label="Deshacer"
                    disabled={!editor.can().undo()}
                    onClick={() => editor.chain().focus().undo().run()}
                />
                <ToolbarButton
                    icon={Redo2}
                    label="Rehacer"
                    disabled={!editor.can().redo()}
                    onClick={() => editor.chain().focus().redo().run()}
                />
            </div>

            <EditorContent editor={editor} />
            <input type="hidden" name={name} value={html} readOnly />
        </div>
    );
}
