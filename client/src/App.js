import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import WaitlistLanding from './pages/WaitlistLanding';
import WaitlistDashboard from './pages/WaitlistDashboard';
import WaitlistVerify from './pages/WaitlistVerify';

const router = createBrowserRouter([
  {
    path: '/',
    element: <WaitlistLanding />,
  },
  {
    path: '/waitlist',
    element: <WaitlistLanding />,
  },
  {
    path: '/waitlist/dashboard/:referralCode',
    element: <WaitlistDashboard />,
  },
  {
    path: '/waitlist/verify',
    element: <WaitlistVerify />,
  }
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </>
  );
}

export default App;
