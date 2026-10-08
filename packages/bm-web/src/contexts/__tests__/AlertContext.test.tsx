import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AlertProvider } from '@/contexts/AlertContext';
import { useAlert } from '@/hooks/useAlert';

function ShowAlert({ message, duration }: { message: string; duration?: number }) {
  const { alert } = useAlert();

  return (
    <button type="button" onClick={() => alert(message, { variant: 'success', duration })}>
      show
    </button>
  );
}

describe('AlertProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws when useAlert is used outside AlertProvider', () => {
    expect(() => render(<ShowAlert message="Saved" />)).toThrow('useAlert must be used within an AlertProvider');
  });

  it('renders an alert and dismisses it after the default duration', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <AlertProvider>
        <ShowAlert message="Settings saved" />
      </AlertProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'show' }));

    expect(screen.getByText('Settings saved')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'success' })).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Settings saved')).not.toBeInTheDocument();
  });

  it('keeps an alert on screen when duration is zero', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <AlertProvider>
        <ShowAlert message="Stay visible" duration={0} />
      </AlertProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'show' }));
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(screen.getByText('Stay visible')).toBeInTheDocument();
  });
});
