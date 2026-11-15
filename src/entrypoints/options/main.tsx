import { createRoot } from 'react-dom/client';
import '~/assets/tailwind.css';
import Options from './Options';

const root = document.getElementById('root');
if (root) createRoot(root).render(<Options />);
