import { SettingsProvider } from '@/contexts/SettingsContext';
import { AlertProvider } from '@/contexts/AlertContext';
import ActiveEnvironment from '@/biz-components/ActiveEnvironment';
import AllEnvironmentsSettings from '@/biz-components/AllEnvironmentsSettings';
import QuickLinks from '@/biz-components/QuickLinks';
import AirwallexLogo from '@/components/AirwallexLogo';
import LanguageSelect from '@/components/LanguageSelect';
import { AppWrapper, HeaderRow, ContentRow, MainContent } from './AppStyles';

function App() {
  return (
    <SettingsProvider>
      <AlertProvider>
        <AppWrapper>
          <HeaderRow>
            <AirwallexLogo margin="0" />
            <LanguageSelect />
          </HeaderRow>
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
