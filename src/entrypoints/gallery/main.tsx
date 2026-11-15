import { createRoot } from 'react-dom/client';
import '~/assets/tailwind.css';
import Gallery from './Gallery';

const root = document.getElementById('root');
if (root) createRoot(root).render(<Gallery />);
