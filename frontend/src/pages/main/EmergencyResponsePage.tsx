import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { InteractiveFloodMap } from '../../components/map/InteractiveFloodMap';
import { Siren, Home, Cross, PhoneCall, PackageCheck, Users } from 'lucide-react';

export const EmergencyResponsePage: React.FC = () => {
  const { selectedLocationId, selectedLocation } = useAuth();
  const [respData, setRespData] = useState<any>(null);

  const loadResponse = async () => {
    try {
      const res = await apiClient.get(`/response/overview?location_id=${selectedLocationId}`);
      setRespData(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadResponse();
  }, [selectedLocationId]);

  const handleIncreaseOccupancy = async (shelter: any) => {
    const updatedOcc = Math.min(shelter.capacity, shelter.current_occupancy + 25);
    await apiClient.put(`/response/shelters/${shelter.id}`, {
      current_occupancy: updatedOcc,
      water_supply_status: shelter.water_supply_status,
      sanitation_status: shelter.sanitation_status,
      status: shelter.status,
    });
    loadResponse();
  };

  const loc = respData?.location || selectedLocation || {
    name: 'Cauvery Basin — Karur',
    latitude: 10.9601,
    longitude: 78.0766,
  };
  const summary = respData?.summary || {};
  const shelters = respData?.shelters || [];
  const hospitals = respData?.hospitals || [];
  const resources = respData?.resources || [];
  const contacts = respData?.emergency_contacts || [];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Siren className="w-6 h-6 text-amber-400" /> Evacuation, Shelters, Hospitals &amp; Emergency Resource Command
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Coordinate relief shelter occupancy, hospital trauma/ICU capacity, NDRF boat deployments, and 24x7 emergency hotlines.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold">
          {summary.response_status || 'LEVEL-3 FULL ACTIVATION'}
        </span>
      </div>

      {/* Response KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-slate-400">Affected Population</p>
          <p className="text-2xl font-extrabold text-orange-300 mt-1">
            {summary.affected_population?.toLocaleString() || '99,200'}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-slate-400">Shelter Occupancy</p>
          <p className="text-2xl font-extrabold text-emerald-300 mt-1">
            {summary.evacuated_to_shelters?.toLocaleString()} / {summary.total_shelter_capacity?.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Utilization: {summary.shelter_utilization_pct}%
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-slate-400">Hospital Beds &amp; ICU Ready</p>
          <p className="text-2xl font-extrabold text-blue-300 mt-1">
            {summary.total_available_beds} Beds ({summary.total_icu_beds} ICU)
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-slate-400">Emergency Ambulances</p>
          <p className="text-2xl font-extrabold text-cyan-300 mt-1">
            {summary.total_ambulances} Active Units
          </p>
        </div>
      </div>

      {/* Shelters & Hospitals Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Home className="w-4 h-4 text-emerald-400" /> Designated Evacuation Shelters
          </h3>
          <div className="space-y-2.5 text-xs">
            {shelters.map((s: any) => (
              <div
                key={s.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <p className="font-bold text-white">{s.name}</p>
                  <p className="text-slate-400">{s.address}</p>
                  <p className="text-emerald-300">
                    Water: <strong>{s.water_supply_status}</strong> | Sanitation:{' '}
                    <strong>{s.sanitation_status}</strong>
                  </p>
                  <p className="text-slate-400">
                    Coordinator: {s.contact_person} ({s.contact_phone})
                  </p>
                </div>
                <div className="text-right space-y-1.5 shrink-0">
                  <p className="font-bold text-sm text-white">
                    {s.current_occupancy} / {s.capacity}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleIncreaseOccupancy(s)}
                    className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-semibold"
                  >
                    +25 Evacuees Check-In
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cross className="w-4 h-4 text-blue-400" /> Flood-Safe Hospitals &amp; Trauma Centers
          </h3>
          <div className="space-y-2.5 text-xs">
            {hospitals.map((h: any) => (
              <div
                key={h.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{h.name}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                    {h.facility_type}
                  </span>
                </div>
                <p className="text-slate-300">
                  Available Beds: <strong>{h.available_beds}</strong> / {h.total_beds} | ICU Beds:{' '}
                  <strong>{h.icu_beds_available}</strong> | Ambulances:{' '}
                  <strong>{h.ambulances_available}</strong>
                </p>
                <p className="text-slate-400">
                  ORS &amp; Antivenom Stock: <strong className="text-emerald-300">{h.antivenom_ors_stock}</strong> | Emergency:{' '}
                  <strong>{h.emergency_phone}</strong>
                </p>
              </div>
            ))}
          </div>

          {/* Emergency Contacts */}
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pt-2">
            <PhoneCall className="w-4 h-4 text-amber-400" /> 24x7 Emergency Command Contacts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {contacts.map((c: any, idx: number) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <p className="font-bold text-amber-300">{c.agency}</p>
                <p className="text-slate-300">{c.commander}</p>
                <p className="font-mono text-white mt-0.5">{c.hotline}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Resources Inventory */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-cyan-400" /> Deployed Emergency &amp; WASH Resources
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase">
              <tr>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Resource Description</th>
                <th className="p-2.5">Deployed</th>
                <th className="p-2.5">Available Reserve</th>
                <th className="p-2.5">Total</th>
                <th className="p-2.5">Command Team</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {resources.map((r: any) => (
                <tr key={r.id}>
                  <td className="p-2.5 font-semibold text-cyan-300">{r.resource_type}</td>
                  <td className="p-2.5 text-white">{r.name}</td>
                  <td className="p-2.5 font-bold text-emerald-300">
                    {r.deployed_quantity} {r.unit}
                  </td>
                  <td className="p-2.5">
                    {r.available_quantity} {r.unit}
                  </td>
                  <td className="p-2.5">
                    {r.total_quantity} {r.unit}
                  </td>
                  <td className="p-2.5 text-slate-300">{r.contact_team}</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GIS Map showing Shelters & Hospitals */}
      <InteractiveFloodMap
        centerLat={loc.latitude}
        centerLng={loc.longitude}
        locationName={loc.name}
        shelters={shelters}
        hospitals={hospitals}
        heightClass="h-[400px]"
      />
    </div>
  );
};
