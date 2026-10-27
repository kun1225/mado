export type TextSourceFormat = 'markdown' | 'plain';

export type TextSourceContent = {
  body: string;
  format: TextSourceFormat;
  /** The original name, like `brief.md`, for download and export. */
  fileName: string;
};
