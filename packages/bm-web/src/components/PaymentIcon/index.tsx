import { getPaymentIconAssetName } from '@/utils/paymentIconMap';
import { getRegisteredLogoUrl } from '@/utils/paymentMethodRegistry';
import { StyledPaymentIcon } from './styles';

// Load SVG assets - ?inline returns data URL for img src
const iconModules = import.meta.glob<string>('../../assets/paymentMethods/*.svg', {
  query: '?inline',
  import: 'default',
  eager: true,
});

const iconMap: Record<string, string> = {};
Object.entries(iconModules).forEach(([path, src]) => {
  const filename = path.split('/').pop()?.split('?')[0] ?? '';
  const assetName = filename.replace(/\.svg$/i, '');
  if (assetName && src) {
    iconMap[assetName] = src;
  }
});

const placeholderSrc = iconMap['placeholder'] ?? '';

const getIconSrc = (assetName: string): string =>
  iconMap[assetName] ?? getRegisteredLogoUrl(assetName) ?? placeholderSrc;

export interface PaymentIconProps {
  name: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
}

const PaymentIcon = ({ name, alt, width = 30, height = 20, className }: PaymentIconProps) => {
  const assetName = getPaymentIconAssetName(name);
  const src = getIconSrc(assetName) ?? placeholderSrc;

  if (!src) {
    return null;
  }

  return (
    <StyledPaymentIcon src={src} alt={alt ?? name} width={width} height={height} className={className} loading="lazy" />
  );
};

export default PaymentIcon;
