import { Suspense } from 'react';
import RegisterFlow from '../../components/RegisterFlow';

export const metadata = {
  title: 'Register — State AI Training'
};

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterFlow />
    </Suspense>
  );
}
