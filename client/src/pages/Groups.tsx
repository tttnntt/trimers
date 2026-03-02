import { Link } from 'react-router-dom';
import { groupsApi } from '../api/client';
import { useEffect, useState } from 'react';
import './Groups.css';

export default function Groups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    groupsApi.list().then(setGroups).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="groups-page">
      <div className="groups-header">
        <h1>Groups & Chats</h1>
        <Link to="/groups/new" className="btn-primary">+ Create Group</Link>
      </div>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <p>No groups yet.</p>
          <Link to="/groups/new" className="btn-primary">Create your first group</Link>
        </div>
      ) : (
        <div className="group-list">
          {groups.map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="group-row">
              <div className="group-avatar">
                {g.profile_picture_url ? (
                  <img src={g.profile_picture_url} alt="" />
                ) : (
                  <span>{g.name[0]}</span>
                )}
              </div>
              <div className="group-info">
                <span className="group-name">{g.name}</span>
                <span className="group-meta">{g.members?.length || 0} members</span>
              </div>
              <span className="arrow">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
