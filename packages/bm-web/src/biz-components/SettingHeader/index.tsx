import { useTranslation } from 'react-i18next';
import Button from '@/components/Button';
import Tooltip from '@/components/Tooltip';
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
  editDisabled?: boolean;
  editDisabledTooltip?: string;
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
  editButtonText,
  editDisabled = false,
  editDisabledTooltip,
  showActivate = false,
  activateButtonText,
  activateButtonVariant = 'primary',
  onActivate,
}: SettingHeaderProps) => {
  const { t } = useTranslation();
  const resolvedEditButtonText = editButtonText ?? t('actions.edit');
  const resolvedActivateButtonText = activateButtonText ?? t('actions.activate', { environment: '' }).trim();
  const editButton = (
    <Button variant="secondary" onClick={onEdit} disabled={loading || editDisabled}>
      {resolvedEditButtonText}
    </Button>
  );

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
              {t('actions.cancel')}
            </Button>
            <Button variant="primary" onClick={onSave} disabled={loading || saveDisabled} loading={loading}>
              {t('actions.save')}
            </Button>
          </>
        ) : (
          <>
            {editDisabled && editDisabledTooltip ? (
              <Tooltip content={editDisabledTooltip}>{editButton}</Tooltip>
            ) : (
              editButton
            )}
            {showActivate && onActivate && (
              <Button variant={activateButtonVariant} onClick={onActivate} disabled={loading} loading={loading}>
                {resolvedActivateButtonText}
              </Button>
            )}
          </>
        )}
      </ButtonsContainer>
    </SettingHeaderContainer>
  );
};

export default SettingHeader;
