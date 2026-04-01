import { SettingsProvider } from '@/contexts/SettingsContext';
import { AlertProvider } from '@/contexts/AlertContext';
import ActiveEnvironment from '@/biz-components/ActiveEnvironment';
import AllEnvironmentsSettings from '@/biz-components/AllEnvironmentsSettings';
import QuickLinks from '@/biz-components/QuickLinks';
import AirwallexLogo from '@/components/AirwallexLogo';
import { AppWrapper, ContentRow, MainContent } from './AppStyles';

function App() {
  return (
    <SettingsProvider>
      <AlertProvider>
        <AppWrapper>
          <AirwallexLogo margin="0 0 56px 0" />
          <ContentRow>
            <MainContent>
              <ActiveEnvironment />
              <AllEnvironmentsSettings />
            </MainContent>
            <QuickLinks />
          </ContentRow>
        </AppWrapper>
      </AlertProvider>
    </SettingsProvider>
  );
}

export default App;
