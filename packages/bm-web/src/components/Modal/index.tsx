import type { ReactNode } from 'react';

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
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  confirmButtonVariant = 'primary',
}: ModalProps) => {
  if (!open) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Overlay onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <Panel onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={loading ? undefined : onClose} type="button" aria-label="Close" disabled={loading}>
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
            {cancelText}
          </Button>
          <Button variant={confirmButtonVariant} onClick={handleConfirm} loading={loading}>
            {confirmText}
          </Button>
        </Footer>
      </Panel>
    </Overlay>
  );
};

export default Modal;
