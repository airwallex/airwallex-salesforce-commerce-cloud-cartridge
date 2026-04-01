import RadioGroup from '@/components/RadioGroup';
import { AUTO_CAPTURE_OPTIONS } from './labels';

export interface AutoCaptureRadioProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

const AutoCaptureRadio = ({ value, onChange }: AutoCaptureRadioProps) => (
  <RadioGroup
    options={AUTO_CAPTURE_OPTIONS}
    value={value ? 'auto' : 'authorize_only'}
    onChange={(v) => onChange(v === 'auto')}
  />
);

export default AutoCaptureRadio;
