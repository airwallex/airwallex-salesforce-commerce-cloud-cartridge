import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/Button';
import { Headline, Body } from '@/components/Typography';
import crossIcon from '@/assets/cross.svg?inline';
import { Overlay, Panel, Header, Body as ModalBody, Footer, CloseButton } from './styles';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  /** Override confirm button variant (default: primary) */
  confirmButtonVariant?: 'primary' | 'danger';
}

const Modal = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  loading = false,
  confirmButtonVariant = 'primary',
}: ModalProps) => {
  const { t } = useTranslation();
  const resolvedConfirmText = confirmText ?? t('actions.confirm');
  const resolvedCancelText = cancelText ?? t('actions.cancel');

  if (!open) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Overlay onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <Panel onClick={(e) => e.stopPropagation()}>
        <CloseButton
          onClick={loading ? undefined : onClose}
          type="button"
          aria-label={t('actions.close')}
          disabled={loading}
        >
          <img src={crossIcon} alt="" />
        </CloseButton>
        <Header>
          <Headline id="modal-title" variant="200">
            {title}
          </Headline>
        </Header>
        <ModalBody>
          <Body variant="primary">{message}</Body>
        </ModalBody>
        <Footer>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {resolvedCancelText}
          </Button>
          <Button variant={confirmButtonVariant} onClick={handleConfirm} loading={loading}>
            {resolvedConfirmText}
          </Button>
        </Footer>
      </Panel>
    </Overlay>
  );
};

export default Modal;
