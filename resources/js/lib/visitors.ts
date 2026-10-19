/** Constantes compartidas por «Visitantes en vivo» y el «Reporte de visitantes». */

export const DEVICES: Record<string, string> = { mobile: 'Celular', tablet: 'Tablet', desktop: 'Computadora', desconocido: 'Desconocido' };

export const chartTooltip = {
    contentStyle: { borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 },
    labelStyle: { fontWeight: 600 },
};
