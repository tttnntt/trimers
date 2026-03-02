import { useParams, Link } from 'react-router-dom';
import { groupsApi, albumsApi, usersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import './GroupDetail.css';

function AddMember({ groupId, onAdded }: { groupId: string; onAdded: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  const search = async () => {
    if (q.trim().length < 2) return;
    try {
      const r = await usersApi.search(q.trim());
      setResults(r);
    } catch {
      setResults([]);
    }
  };

  const add = async (userId: string) => {
    setAdding(userId);
    try {
      await groupsApi.addMember(groupId, userId);
      onAdded();
      setResults([]);
      setQ('');
    } catch (e: any) {
      alert(e.message || 'Failed to add');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="add-member">
      <input
        type="text"
        placeholder="Search users to add..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && search()}
      />
      <button type="button" onClick={search} className="btn-sm">Search</button>
      {results.length > 0 && (
        <div className="add-results">
          {results.map((u) => (
            <button key={u.id} onClick={() => add(u.id)} disabled={adding === u.id} className="add-user-btn">
              {u.username || u.email} {adding === u.id ? '...' : '+ Add'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  useAuth();
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const load = (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    groupsApi.get(id).then(setGroup).catch(() => {}).finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => {
    load();
  }, [id]);

  const startRound = async () => {
    if (!id) return;
    setStarting(true);
    try {
      const round = await albumsApi.startRound(id);
      window.location.href = `/rounds/${round.id}`;
    } catch (e: any) {
      alert(e.message || 'Failed to start round');
    } finally {
      setStarting(false);
    }
  };

  if (loading || !group) {
    return <p className="text-muted">Loading...</p>;
  }

  return (
    <div className="group-detail-page">
      <div className="group-header">
        <Link to={`/groups/${id}/bio`} className="group-bio-link">
          <div className="group-avatar large">
            {group.profile_picture_url ? (
              <img src={group.profile_picture_url} alt="" />
            ) : (
              <span>{group.name[0]}</span>
            )}
          </div>
        </Link>
        <h1>{group.name}</h1>
        <Link to={`/groups/${id}/bio`} className="link-btn">View Group Bio & Albums</Link>
      </div>

      <div className="members-section">
        <h3>Members</h3>
        <AddMember groupId={id!} onAdded={() => load(true)} />
        <div className="member-list">
          {group.members?.map((m: any) => (
            <div key={m.user.id} className="member-chip">
              <span>{m.user.username || m.user.email || 'Anonymous'}</span>
              {m.user.bio && <span className="bio-tag">{m.user.bio}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounds-section">
        <h3>Album Rounds</h3>
        {group.rounds?.length ? (
          <div className="round-list">
            {group.rounds.map((r: any) => (
              <Link key={r.id} to={`/rounds/${r.id}`} className="round-card">
                <span>Started by {r.starter_username || 'Unknown'}</span>
                <span className="round-meta">
                  {new Date(r.started_at).toLocaleDateString()} • 
                  {r.ends_at > Date.now() ? ' Active (48h)' : ' Ended'}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted">No album rounds yet.</p>
        )}
      </div>

      <button
        onClick={startRound}
        disabled={starting}
        className="btn-primary btn-full start-round-btn"
      >
        {starting ? 'Starting...' : 'Start New Album Round (48h countdown)'}
      </button>

      <p className="hint">When you start a round, everyone in the group has 48 hours to submit their album (3–10 photos). Albums appear in the group bio.</p>
    </div>
  );
}
