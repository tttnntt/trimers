import { useParams, Link } from 'react-router-dom';
import { albumsApi } from '../api/client';
import { useEffect, useState } from 'react';
import './GroupBio.css';

export default function GroupBio() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    albumsApi.getGroupBio(id).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading || !data) {
    return <p className="text-muted">Loading...</p>;
  }

  const { group, rounds } = data;

  return (
    <div className="group-bio-page">
      <div className="bio-header">
        <div className="group-avatar large">
          {group.profile_picture_url ? (
            <img src={group.profile_picture_url} alt="" />
          ) : (
            <span>{group.name[0]}</span>
          )}
        </div>
        <h1>{group.name}</h1>
        <Link to={`/groups/${id}`} className="link-btn">← Back to Group</Link>
      </div>

      <section className="albums-section">
        <h2>Albums (always viewable here)</h2>
        {!rounds?.length ? (
          <p className="text-muted">No albums yet. Start a round from the group page!</p>
        ) : (
          <div className="rounds-grid">
            {rounds.map((r: any) => (
              <div key={r.id} className="round-block">
                <p className="round-label">
                  Round • {new Date(r.started_at).toLocaleDateString()}
                </p>
                <div className="album-cards">
                  {r.albums?.map((a: any) => (
                    <Link
                      key={a.id}
                      to={`/rounds/${r.id}`}
                      className="album-card"
                    >
                      <div className="album-thumb">
                        {a.thumbnail_url ? (
                          <img src={a.thumbnail_url} alt="" />
                        ) : (
                          <span>📷</span>
                        )}
                      </div>
                      <span className="album-author">{a.username || 'Anonymous'}</span>
                      <span className="album-stars">★ {a.star_count || 0}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
