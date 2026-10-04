import LoginForm from '../components/auth/LoginForm';
import { NoIndex } from '../components/seo/Seo';

const LoginPage = () => {
  return <LoginForm />;
};

export default function LoginPageRoute() {
  return (
    <>
      <NoIndex title="Sign in" />
      <LoginPage />
    </>
  );
}
