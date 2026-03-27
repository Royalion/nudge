import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/shared';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAFA] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="space-y-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
            className="text-8xl font-extrabold tracking-tighter text-stride-200 select-none"
          >
            404
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-stride-900">Page not found</h1>
          <p className="text-sm text-stride-500 leading-relaxed max-w-xs mx-auto">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link to="/">
            <Button className="gap-2 rounded-xl h-11 px-6">
              <Home className="w-4 h-4" /> Go Home
            </Button>
          </Link>
          <button onClick={() => window.history.back()}>
            <Button variant="outline" className="gap-2 rounded-xl h-11 px-6">
              <ArrowLeft className="w-4 h-4" /> Go Back
            </Button>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
