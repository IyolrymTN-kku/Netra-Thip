export const PDF_PAGE_WIDTH_MM = 210;
export const PDF_PAGE_HEIGHT_MM = 297;

const CSS_PX_PER_MM = 96 / 25.4;

export const PDF_PAGE_WIDTH_PX = Math.round(PDF_PAGE_WIDTH_MM * CSS_PX_PER_MM);
export const PDF_PAGE_HEIGHT_PX = Math.round(PDF_PAGE_HEIGHT_MM * CSS_PX_PER_MM);
