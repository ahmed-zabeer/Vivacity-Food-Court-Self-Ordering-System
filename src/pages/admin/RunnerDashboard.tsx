import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { sound } from '../../services/sound';
import { RunnerTask } from '../../types';
import { Bike, CheckCircle2, Clock, MapPin, Store, ArrowRight } from 'lucide-react';

export const RunnerDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<RunnerTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await api.getRunners();
      setTasks(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    const unsubTask = realtime.on('runner_task_created', () => {
      sound.playKitchenBell();
      fetchTasks();
    });

    const unsubUpdated = realtime.on('runner_task_updated', () => {
      fetchTasks();
    });

    return () => {
      unsubTask();
      unsubUpdated();
    };
  }, []);

  const handleUpdateStatus = async (taskId: string, status: string) => {
    try {
      await api.updateRunnerStatus(taskId, status);
      if (status === 'DELIVERED') sound.playPaymentSuccess();
      fetchTasks();
    } catch (e) {
      alert('Failed to update runner status');
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-4 md:p-6 pb-4 sm:pb-6 space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Bike className="w-5 h-5 text-brand-600" />
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            Floor Runner &amp; Delivery Console
          </h1>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          Unified tray deliveries to dining tables once all stall kitchens finish cooking
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-zinc-200 text-zinc-400 space-y-2">
          <Bike className="w-12 h-12 mx-auto text-zinc-300" />
          <h3 className="text-sm font-bold text-zinc-600">No Pending Tray Deliveries</h3>
          <p className="text-xs">Unified runner tasks appear automatically when all stalls mark dishes ready.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-5 rounded-3xl border-2 transition-all space-y-4 ${
                task.status === 'READY_TO_DELIVER'
                  ? 'bg-amber-50/40 border-amber-400 shadow-sm'
                  : task.status === 'OUT_FOR_DELIVERY'
                  ? 'bg-blue-50/40 border-blue-400 shadow-sm'
                  : 'bg-white border-zinc-200 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80">
                <div>
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-widest block">
                    Runner Delivery Task
                  </span>
                  <div className="text-xl font-black text-zinc-900">
                    TOKEN #{task.token}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="px-3 py-1 rounded-full bg-brand-500 text-white text-xs font-black uppercase tracking-wider shadow-xs">
                      {task.tableId ? `TABLE ${task.tableId}` : 'PARCEL COUNTER'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                      Service Type: TABLE SERVICE
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">
                    {new Date(task.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Stalls Consolidated in Tray */}
              <div className="space-y-1.5 text-xs">
                {(task.customerName || task.customerPhone) && (
                  <div className="text-[11px] font-bold text-zinc-700 bg-white p-2 rounded-xl border border-zinc-200">
                    Guest: <span className="text-zinc-900 font-extrabold">{task.customerName || 'Guest'}</span>
                    {task.customerPhone && <span className="text-zinc-500 font-normal ml-1">({task.customerPhone})</span>}
                  </div>
                )}
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                  Consolidated Kitchen Stalls:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {task.stalls.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-white border border-zinc-200 font-bold text-zinc-800 text-[11px]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Delivery Action Button */}
              <div className="pt-2">
                {task.status === 'READY_TO_DELIVER' ? (
                  <button
                    onClick={() => handleUpdateStatus(task.id, 'OUT_FOR_DELIVERY')}
                    className="w-full py-3.5 px-4 rounded-2xl bg-zinc-900 hover:bg-black text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Bike className="w-4 h-4" />
                    <span>Pick Up Tray &amp; Deliver to Table</span>
                  </button>
                ) : task.status === 'OUT_FOR_DELIVERY' ? (
                  <button
                    onClick={() => handleUpdateStatus(task.id, 'DELIVERED')}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Delivered to Table {task.tableId}</span>
                  </button>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black text-center">
                    ✓ Order Delivered
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
