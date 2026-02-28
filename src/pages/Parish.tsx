import { useState, useEffect } from "react";
import { MapPin, Phone, Mail, Clock, Users, Cross } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface ParishInfo {
  name: string;
  nameSw: string;
  address: string;
  addressSw: string;
  phone: string;
  email: string;
  clergy: { name: string; role: string; roleSw: string }[];
  confessionSaturday: string;
  confessionWeekdays: string;
  confessionWeekdaysSw: string;
  massSunday: string;
  massWeekday: string;
  massSaturday: string;
  ministries: string;
  ministriesSw: string;
}

// Fallback so the page never looks empty before data loads
const FALLBACK: ParishInfo = {
  name: "St. Gregory Catholic Parish",
  nameSw: "Parokia ya Katoliki ya Mt. Yosefu",
  address: "123 Cathedral Road, Westlands, Nairobi, Kenya",
  addressSw: "123 Barabara ya Kanisa Kuu, Westlands, Nairobi, Kenya",
  phone: "+254 700 123 456",
  email: "info@stjosephnairobi.or.ke",
  clergy: [
    { name: "Fr. John Kamau",        role: "Parish Priest",    roleSw: "Paroko" },
    { name: "Fr. Peter Ochieng",     role: "Assistant Priest", roleSw: "Kasisi Msaidizi" },
    { name: "Deacon Francis Mwangi", role: "Deacon",           roleSw: "Shemasi" },
  ],
  confessionSaturday: "3:00 PM - 5:00 PM",
  confessionWeekdays: "By appointment",
  confessionWeekdaysSw: "Kwa miadi",
  massSunday: "7:00 AM, 9:00 AM, 11:00 AM (Kiswahili), 5:00 PM",
  massWeekday: "6:30 AM, 12:10 PM, 5:30 PM",
  massSaturday: "7:00 AM, 5:30 PM (Vigil)",
  ministries: "Catholic Men Association (CMA), Catholic Women Association (CWA), Youth Group, Choir, Legion of Mary, St. Vincent de Paul Society",
  ministriesSw: "Chama cha Wanaume Wakatoliki, Chama cha Wanawake Wakatoliki, Kikundi cha Vijana, Kwaya, Jeshi la Maria, Shirika la Mt. Vinsenti wa Paulo",
};

const Parish = () => {
  const { t, language } = useLanguage();
  const [info, setInfo] = useState<ParishInfo>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Live listener — updates instantly when admin saves
    const unsubscribe = onSnapshot(doc(db, "parish", "info"), (snap) => {
      if (snap.exists()) setInfo(snap.data() as ParishInfo);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  // Parse comma-separated time strings into arrays
  const parseTimes = (str: string) =>
    str.split(",").map((s) => s.trim()).filter(Boolean);

  // Parse comma-separated ministries, zip EN+SW by index
  const parseMinistries = () => {
    const en = info.ministries.split(",").map((s) => s.trim()).filter(Boolean);
    const sw = info.ministriesSw.split(",").map((s) => s.trim()).filter(Boolean);
    return en.map((name, i) => ({
      en: name,
      sw: sw[i] || name,
    }));
  };

  if (loading) {
    return (
      <div className="animate-fade-in px-4 py-4">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          {t("Parish Information", "Taarifa za Parokia")}
        </h2>
        <div className="text-center py-12 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 py-4">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">
        {t("Parish Information", "Taarifa za Parokia")}
      </h2>

      {/* Contact Card */}
      <div className="rounded-xl bg-card border border-border p-4 mb-4">
        <h3 className="font-display text-lg font-semibold text-foreground mb-3">
          {t(info.name, info.nameSw)}
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">
              {t(info.address, info.addressSw)}
            </p>
          </div>
          {info.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-accent shrink-0" />
              <p className="text-sm text-foreground">{info.phone}</p>
            </div>
          )}
          {info.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-accent shrink-0" />
              <p className="text-sm text-foreground">{info.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Clergy */}
      {info.clergy.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4 mb-4">
          <h3 className="font-display text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Cross className="h-4 w-4 text-accent" />
            {t("Clergy", "Makasisi")}
          </h3>
          <div className="space-y-3">
            {info.clergy.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground shrink-0">
                  {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(c.role, c.roleSw)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confession */}
      <div className="rounded-xl bg-card border border-border p-4 mb-4">
        <h3 className="font-display text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" />
          {t("Confession Times", "Ratiba za Ungamo")}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("Saturday", "Jumamosi")}</span>
            <span className="font-medium text-foreground">{info.confessionSaturday}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("Weekdays", "Siku za Juma")}</span>
            <span className="font-medium text-foreground">
              {t(info.confessionWeekdays, info.confessionWeekdaysSw)}
            </span>
          </div>
        </div>
      </div>

      {/* Mass Times */}
      <div className="rounded-xl bg-card border border-border p-4 mb-4">
        <h3 className="font-display text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" />
          {t("Mass Times", "Ratiba za Misa")}
        </h3>
        <div className="space-y-3">
          {[
            { label: t("Sunday", "Jumapili"),     times: parseTimes(info.massSunday) },
            { label: t("Weekdays", "Siku za Juma"), times: parseTimes(info.massWeekday) },
            { label: t("Saturday", "Jumamosi"),   times: parseTimes(info.massSaturday) },
          ].map((row) => (
            <div key={row.label} className="flex gap-3">
              <p className="text-sm font-semibold text-foreground w-24 shrink-0">{row.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {row.times.map((time) => (
                  <span key={time} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {time}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ministries */}
      {info.ministries && (
        <div className="rounded-xl bg-card border border-border p-4 mb-6">
          <h3 className="font-display text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            {t("Groups & Ministries", "Vikundi na Huduma")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {parseMinistries().map((m, i) => (
              <span key={i} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                {t(m.en, m.sw)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Parish;