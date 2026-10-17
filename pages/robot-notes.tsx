import Head from 'next/head';
import { useRouter } from 'next/router';
import { NotebookPen } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RobotNotesWorkspace from '@/components/notes/RobotNotesWorkspace';

export default function RobotNotesPage() {
  const router = useRouter();
  const eventKey = typeof router.query.event_key === 'string' ? router.query.event_key : undefined;
  const year = typeof router.query.year === 'string' ? Number(router.query.year) : undefined;
  const team = typeof router.query.team_number === 'string' ? Number(router.query.team_number) : undefined;
  return <ProtectedRoute><Layout>
    <Head><title>Robot Notes | Avalanche Scouting</title></Head>
    <header><div className="mb-2 flex items-center gap-3"><NotebookPen className="h-7 w-7 text-primary" /><h1 className="text-3xl font-bold">Robot Notes</h1></div><p className="text-muted-foreground">Capture what you notice on the field. Choose an event and find observations for any robot.</p></header>
    {router.isReady && <RobotNotesWorkspace eventKey={eventKey} eventYear={year} teamNumber={team} />}
  </Layout></ProtectedRoute>;
}
