import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import "../../styles/admin.css";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      if (res.data.success) {
        // Filter out admins - only keep customers (this now includes
        // soft-deleted customers too, so they can be restored)
        const customers = res.data.users.filter(user => user.role === 'customer');
        setUsers(customers);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.address?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  const handleDelete = async (user) => {
    if (
      !window.confirm(
        `Delete user "${user.full_name}"? Their order history is kept, and you can restore the account later.`
      )
    ) {
      return;
    }

    setDeletingId(user.user_id);
    try {
      await api.delete(`/users/${user.user_id}`);
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === user.user_id ? { ...u, is_deleted: 1 } : u
        )
      );
      toast.success("User deleted");
    } catch (err) {
      console.error("Failed to delete user:", err);
      toast.error(err.response?.data?.message || "Could not delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestore = async (user) => {
    setRestoringId(user.user_id);
    try {
      await api.patch(`/users/${user.user_id}/restore`);
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === user.user_id ? { ...u, is_deleted: 0 } : u
        )
      );
      toast.success(`"${user.full_name}" restored`);
    } catch (err) {
      console.error("Failed to restore user:", err);
      toast.error(err.response?.data?.message || "Could not restore user");
    } finally {
      setRestoringId(null);
    }
  };

  if (loading) return <div className="admin-loading">Loading users...</div>;
  if (error) return <div className="admin-loading">{error}</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Users</h2>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2>All Customers ({filteredUsers.length})</h2>
          <input
            type="text"
            className="admin-search-box"
            placeholder="Search by name, username, email, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredUsers.length === 0 ? (
          <p className="admin-muted">
            {users.length === 0
              ? "No customers have registered yet."
              : "No customers match your search."}
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Gender</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isDeleted = !!user.is_deleted;
                return (
                  <tr key={user.user_id} className={isDeleted ? "admin-row-deleted" : ""}>
                    <td>#{user.user_id}</td>
                    <td>
                      {user.full_name}
                      {isDeleted && (
                        <span className="category-pill admin-deleted-badge">Deleted</span>
                      )}
                    </td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.phone_number || "—"}</td>
                    <td className="admin-address-cell" title={user.address || ""}>
                      {user.address || "—"}
                    </td>
                    <td>{user.gender || "—"}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      {isDeleted ? (
                        <button
                          className="admin-btn admin-btn-outline"
                          disabled={restoringId === user.user_id}
                          onClick={() => handleRestore(user)}
                        >
                          {restoringId === user.user_id ? "Restoring..." : "Restore"}
                        </button>
                      ) : (
                        <button
                          className="admin-btn admin-btn-danger"
                          disabled={deletingId === user.user_id}
                          onClick={() => handleDelete(user)}
                        >
                          {deletingId === user.user_id ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}