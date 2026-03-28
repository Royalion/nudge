import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../lib/auth';
import { Card, Input, Label, Button, cn } from '../components/shared';
import { User, Bell, Shield, Smartphone, Mail, Clock, Zap, ArrowUpRight, LogOut } from 'lucide-react';
import { useAppStore } from '../lib/store';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { state, dispatch } = useAppStore();
  const [activeTab, setActiveTab] = useState('notifications');
  const [name, setName] = useState(user?.user_metadata?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const updateSetting = (key: keyof typeof state.notificationSettings, value: any) => {
    dispatch({ type: 'UPDATE_NOTIFICATION_SETTINGS', payload: { [key]: value } });
  };

  const tabs = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'notifications', icon: Bell, label: 'Reminders & AI' },
    { id: 'security', icon: Shield, label: 'Security' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stride-900">Settings</h1>
        <p className="text-sm text-stride-500 font-medium mt-0.5">Manage your account and preferences.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
              activeTab === item.id
                ? "bg-stride-800 text-white shadow-sm"
                : "bg-stride-50 text-stride-500 hover:bg-stride-100"
            )}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-base font-bold text-gray-900">Profile Information</h2>
              <p className="text-xs text-gray-500 font-medium mt-1">Update your personal details.</p>
            </div>

            <div className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-gray-50/50 h-10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input id="email" type="email" value={email} disabled className="bg-gray-100 text-gray-500 cursor-not-allowed h-10 text-sm" />
                <p className="text-[11px] text-gray-400">Email cannot be changed.</p>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button className="text-sm h-9 px-5 rounded-xl shadow-sm">Save Changes</Button>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-500" /> Retention & Reminders
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-1">Control how the AI agent keeps you on track.</p>
            </div>

            <div className="space-y-6">
              {/* Channels */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Channels</h3>

                <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50/30 hover:border-purple-200 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Push Notifications</div>
                      <p className="text-xs text-gray-500 mt-0.5">Daily check-ins and recovery prompts.</p>
                    </div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={state.notificationSettings.pushEnabled} onChange={(e) => updateSetting('pushEnabled', e.target.checked)} />
                    <div className="w-10 h-[22px] bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-purple-600 after:shadow-sm"></div>
                  </div>
                </label>

                <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50/30 hover:border-purple-200 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Email Fallback</div>
                      <p className="text-xs text-gray-500 mt-0.5">Get notified if you miss check-in.</p>
                    </div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={state.notificationSettings.emailEnabled} onChange={(e) => updateSetting('emailEnabled', e.target.checked)} />
                    <div className="w-10 h-[22px] bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-purple-600 after:shadow-sm"></div>
                  </div>
                </label>
              </div>

              {/* Timing */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Timing & AI Behavior</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="time" className="text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" /> Check-in Time
                    </Label>
                    <Input
                      type="time"
                      id="time"
                      value={state.notificationSettings.dailyCheckInTime}
                      onChange={(e) => updateSetting('dailyCheckInTime', e.target.value)}
                      className="bg-gray-50/50 h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="frequency" className="text-xs flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-gray-400" /> Nudge Frequency
                    </Label>
                    <select
                      id="frequency"
                      value={state.notificationSettings.frequency}
                      onChange={(e) => updateSetting('frequency', e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      <option value="high">High (Daily)</option>
                      <option value="balanced">Balanced (Smart)</option>
                      <option value="low">Low (Missed Only)</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-blue-100 bg-blue-50/30 hover:border-blue-200 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-blue-500 fill-current" />
                    <div>
                      <div className="text-sm font-semibold text-blue-900">Proactive AI Coaching</div>
                      <p className="text-xs text-blue-700/70 mt-0.5">AI suggests lower-friction tasks if you miss days.</p>
                    </div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={state.notificationSettings.coachProactive} onChange={(e) => updateSetting('coachProactive', e.target.checked)} />
                    <div className="w-10 h-[22px] bg-blue-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-blue-600 after:shadow-sm"></div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 sm:p-6 space-y-5 bg-red-50/20">
            <div className="border-b border-red-100 pb-4">
              <h2 className="text-base font-bold text-red-600">Danger Zone</h2>
              <p className="text-xs text-red-500 font-medium mt-1">Irreversible account actions.</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Delete Account</h3>
                <p className="text-xs text-gray-500 mt-0.5">Permanently remove all data and goals.</p>
              </div>
              <Button variant="danger" className="shrink-0 text-sm rounded-xl h-9 px-5">Delete Account</Button>
            </div>
          </div>
        )}

        {/* Upgrade CTA - Always visible */}
        {!state.userState?.isPremium && (
          <Link to="/dashboard/upgrade" className="block">
            <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/15 transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Upgrade to Pro</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Unlimited goals, AI coaching & analytics</p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </div>
            </div>
          </Link>
        )}

        {state.userState?.isPremium && (
          <div className="bg-amber-50/50 rounded-2xl border border-amber-100 p-5 flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-600 fill-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-amber-800">Pro Member</h3>
              <p className="text-xs text-amber-700/70 mt-0.5">You have access to all premium features.</p>
            </div>
          </div>
        )}

        {/* Mobile-only sign out (desktop has it in sidebar) */}
        <div className="md:hidden pt-2">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-gray-100"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}