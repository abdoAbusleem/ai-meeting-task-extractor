import { registerAs } from '@nestjs/config';

export default registerAs('swagger', () => ({
  siteTitle: process.env.SWAGGER_SITE_TITLE ?? 'AI Sprint API Docs',
  docTitle: process.env.SWAGGER_DOC_TITLE ?? 'AI Sprint Backend',
  docDescription:
    process.env.SWAGGER_DOC_DESCRIPTION ?? 'AI Sprint backend API documentation',
  docVersion: process.env.SWAGGER_DOC_VERSION ?? '1.0.0',
}));