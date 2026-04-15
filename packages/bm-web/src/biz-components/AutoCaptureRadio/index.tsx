import RadioGroup from '@/components/RadioGroup';
import { getAutoCaptureOptions } from './labels';

export interface AutoCaptureRadioProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

const AutoCaptureRadio = ({ value, onChange }: AutoCaptureRadioProps) => (
  <RadioGroup
    options={getAutoCaptureOptions()}
    value={value ? 'auto' : 'authorize_only'}
    onChange={(v) => onChange(v === 'auto')}
  />
);

export default AutoCaptureRadio;
