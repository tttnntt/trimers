import { useState } from 'react';
import { usersApi } from '../api/client';
import './SearchFriends.css';

export default function SearchFriends() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (q.trim().length < 2) return;
    setLoading(true);
    try {
      const r = await usersApi.search(q.trim());
      setResults(r);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-page">
      <h1>Search for Friends</h1>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by username or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button onClick={search} disabled={loading} className="btn-primary">Search</button>
      </div>
      <div className="results">
        {results.map((u) => (
          <div key={u.id} className="user-row">
            <div className="user-avatar">
              {u.profile_picture_url ? (
                <img src={u.profile_picture_url} alt="" />
              ) : (
                <span>{u.username?.[0] || u.email?.[0] || '?'}</span>
              )}
            </div>
            <div className="user-info">
              <span className="username">{u.username || 'No username'}</span>
              {u.bio && <span className="bio">{u.bio}</span>}
            </div>
            <span className="hint">Add to group from group page</span>
          </div>
        ))}
      </div>
    </div>
  );
}
