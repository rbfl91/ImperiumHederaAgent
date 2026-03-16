import Header from './components/Header';
import Footer from './components/Footer';
import RfqProgress from './components/Sidebar/RfqProgress';
import InvestmentDetails from './components/Sidebar/InvestmentDetails';
import WalletPanel from './components/Sidebar/WalletPanel';
import ChatPanel from './components/Chat/ChatPanel';
import { useWebSocket } from './hooks/useWebSocket';

export default function App() {
  const { sendMessage } = useWebSocket();

  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <aside className="sidebar-left">
          <RfqProgress />
        </aside>
        <section className="chat-center">
          <ChatPanel onSend={sendMessage} />
        </section>
        <aside className="sidebar-right">
          <WalletPanel />
          <InvestmentDetails />
        </aside>
      </main>
      <Footer />
    </div>
  );
}
