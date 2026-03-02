import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsApi } from '../api/client';
import { useEffect, useState } from 'react';
import './Home.css';

export default function Home() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    groupsApi.list().then(setGroups).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-page">
      <h1>Welcome{user?.username ? `, ${user.username}` : ''}</h1>
      <p className="home-sub">Your groups and album rounds</p>

      <nav className="home-commands">
        <Link to="/groups/new" className="cmd-card">
          <span className="cmd-icon">+</span>
          <span>Create Group</span>
        </Link>
        <Link to="/search" className="cmd-card">
          <span className="cmd-icon">🔍</span>
          <span>Search for Friends</span>
        </Link>
        <Link to="/settings" className="cmd-card">
          <span className="cmd-icon">⚙</span>
          <span>Settings</span>
        </Link>
        <Link to="/report" className="cmd-card">
          <span className="cmd-icon">!</span>
          <span>Report</span>
        </Link>
        <Link to="/groups" className="cmd-card cmd-highlight">
          <span className="cmd-icon">👥</span>
          <span>Open All Groups & Chats</span>
        </Link>
      </nav>

      <section className="home-groups">
        <h2>Your Groups</h2>
        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : groups.length === 0 ? (
          <p className="text-muted">No groups yet. Create one to get started!</p>
        ) : (
          <div className="group-grid">
            {groups.map((g) => (
              <Link key={g.id} to={`/groups/${g.id}`} className="group-card">
                <div className="group-avatar">
                  {g.profile_picture_url ? (
                    <img src={g.profile_picture_url} alt="" />
                  ) : (
                    <span>{g.name[0]}</span>
                  )}
                </div>
                <span className="group-name">{g.name}</span>
                <span className="group-meta">{g.members?.length || 0} members</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
