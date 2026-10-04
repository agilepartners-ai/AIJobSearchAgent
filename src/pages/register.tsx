import RegisterForm from '../components/auth/RegisterForm';
import { NoIndex } from '../components/seo/Seo';

const RegisterPage = () => {
  return <RegisterForm />;
};

export default function RegisterPageRoute() {
  return (
    <>
      <NoIndex title="Create your account" />
      <RegisterPage />
    </>
  );
}
