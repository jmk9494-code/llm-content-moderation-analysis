import { redirect } from 'next/navigation';

// Redirect home page directly to dashboard
// Dashboard now has the immersive scrollytelling intro
export default function HomePage() {
  redirect('/compare');
}
