import VerifyPhone from '../components/auth/VerifyPhone';
import { NoIndex } from '../components/seo/Seo';

const VerifyPhonePage = () => {
  return <VerifyPhone />;
};

export default function VerifyPhonePageRoute() {
  return (
    <>
      <NoIndex title="Verify your phone" />
      <VerifyPhonePage />
    </>
  );
}
