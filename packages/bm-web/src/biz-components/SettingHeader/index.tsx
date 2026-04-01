import Button from '@/components/Button';
import { SettingHeaderContainer, TextContainer, ButtonsContainer } from './styles';

import type { ReactNode } from 'react';

export interface SettingHeaderProps {
  title: ReactNode;
  description: ReactNode;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  loading?: boolean;
  saveDisabled?: boolean;
  editButtonText?: string;
  showActivate?: boolean;
  activateButtonText?: string;
  activateButtonVariant?: 'primary' | 'secondary';
  onActivate?: () => void;
}

const SettingHeader = ({
  title,
  description,
  editing,
  onEdit,
  onCancel,
  onSave,
  loading = false,
  saveDisabled = false,
  editButtonText = 'Edit',
  showActivate = false,
  activateButtonText = 'Activate',
  activateButtonVariant = 'primary',
  onActivate,
}: SettingHeaderProps) => {
  return (
    <SettingHeaderContainer>
      <TextContainer>
        <div>{title}</div>
        <div>{description}</div>
      </TextContainer>
      <ButtonsContainer>
        {editing ? (
          <>
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onSave} disabled={loading || saveDisabled} loading={loading}>
              Save
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onEdit} disabled={loading}>
              {editButtonText}
            </Button>
            {showActivate && onActivate && (
              <Button variant={activateButtonVariant} onClick={onActivate} disabled={loading} loading={loading}>
                {activateButtonText}
              </Button>
            )}
          </>
        )}
      </ButtonsContainer>
    </SettingHeaderContainer>
  );
};

export default SettingHeader;
