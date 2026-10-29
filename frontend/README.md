# HireSense AI — Frontend

Client-side Single Page Application for HireSense AI built with:
- React 19
- Vite 8
- Tailwind CSS v4
- React Router 7
- Recharts

## Environment Configuration
Copy `.env.example` to `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```
In production on Vercel (when hosted as a single project with the backend), `VITE_API_URL` defaults automatically to `/api`.

## Scripts
- `npm run dev`: Start Vite development server
- `npm run build`: Compile optimized production bundle
- `npm run lint`: Run ESLint check
