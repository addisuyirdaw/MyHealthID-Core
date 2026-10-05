const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../app/system-admin/users/UserManagementClient.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add imports
content = content.replace(
  /resetUserPasswordSysAdmin,\n  toggleUserActiveSysAdmin,\n} from "@\/lib\/actions\/system-admin\.actions";/g,
  `resetUserPasswordSysAdmin,\n  toggleUserActiveSysAdmin,\n  approveUserRegistration,\n  rejectUserRegistration,\n} from "@/lib/actions/system-admin.actions";`
);

// Add isApproved to User type
content = content.replace(
  /isActive: boolean;\n  isTempPassword: boolean;/g,
  `isActive: boolean;\n  isApproved: boolean;\n  isTempPassword: boolean;`
);

// Add tab state
content = content.replace(
  /const \[roleFilter, setRoleFilter\] = useState\("ALL"\);\n  const \[, startTransition\] = useTransition\(\);/g,
  `const [roleFilter, setRoleFilter] = useState("ALL");\n  const [tab, setTab] = useState<"ALL" | "PENDING">("ALL");\n  const [, startTransition] = useTransition();`
);

// Add approve/reject handlers
content = content.replace(
  /const handleResetSuccess = \(code: string\) => {/g,
  `const handleApprove = (user: User) => {
    startTransition(async () => {
      const res = await approveUserRegistration(user.id);
      if (!res.success) {
        showToast("error", res.error ?? "Failed to approve");
        return;
      }
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isApproved: true } : u));
      showToast("success", "User approved successfully.");
    });
  };

  const handleReject = (user: User) => {
    if (!confirm("Are you sure you want to reject and delete this registration?")) return;
    startTransition(async () => {
      const res = await rejectUserRegistration(user.id);
      if (!res.success) {
        showToast("error", res.error ?? "Failed to reject");
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showToast("success", "Registration rejected.");
    });
  };

  const handleResetSuccess = (code: string) => {`
);

// Update filter logic
content = content.replace(
  /const matchesRole = roleFilter === "ALL" \|\| u\.role === roleFilter;\n\n    return matchesSearch && matchesRole;/g,
  `const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesTab = tab === "PENDING" ? !u.isApproved : true;

    return matchesSearch && matchesRole && matchesTab;`
);

// Add Tab UI above Search bar
content = content.replace(
  /\{\/\* Controls \*\/\}\n      <div className="flex items-center/g,
  `{/* Tabs */}
      <div className="flex items-center gap-2 mb-6 bg-neutral-900/50 p-1.5 rounded-xl border border-neutral-800/60 w-fit">
        <button
          onClick={() => setTab("ALL")}
          className={\`px-4 py-2 rounded-lg text-sm font-semibold transition \${tab === "ALL" ? "bg-purple-600 text-white shadow" : "text-neutral-400 hover:text-white"}\`}
        >
          All Users
        </button>
        <button
          onClick={() => setTab("PENDING")}
          className={\`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 \${tab === "PENDING" ? "bg-purple-600 text-white shadow" : "text-neutral-400 hover:text-white"}\`}
        >
          Pending Staff
          {users.filter(u => !u.isApproved).length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {users.filter(u => !u.isApproved).length}
            </span>
          )}
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center`
);

// Update actions column in table
content = content.replace(
  /\{u\.isActive \? <ToggleRight className="w-4 h-4" \/> : <ToggleLeft className="w-4 h-4" \/>\}\n                      <\/button>\n                      <button/g,
  `{u.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      {!u.isApproved && (
                        <>
                          <button onClick={() => handleApprove(u)} title="Approve" className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleReject(u)} title="Reject" className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button`
);

fs.writeFileSync(file, content);
console.log("Updated UserManagementClient.tsx");
