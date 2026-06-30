export {
  buildLazyCatFileUrl,
  isVideoPath,
  normalizeLazyCatPath,
  requiresAccessPassword,
} from './netdisk-path';

export const LAZYCAT_DEPLOYED_ENV = 'NEXT_PUBLIC_LAZYCAT_DEPLOYED';
export const REQUIRED_DEPLOY_PARAM_IDS = [
  'mimo_api_key',
  'agora_app_id',
  'agora_app_certificate',
  'backend_api_secret',
] as const;

export const REQUIRED_PACKAGE_PERMISSIONS = [
  'net.internet',
  'document.read',
  'media.read',
] as const;
