import { getSettings } from "@/lib/queries";
import { whatsappHref } from "@/lib/business";
import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui";
import { FamilyScene } from "@/components/family-scene";
export default async function HelpPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-6">
      <PageHeading
        title="Kami sedia membantu"
        description="Portal ini pilihan. Anda boleh terus berurusan melalui WhatsApp seperti biasa."
      />
      <div className="hero-panel grid items-center gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold">Hantar resit kepada AJK</h2>
          <p className="mt-3 leading-8 text-slate-600">
            Sertakan nama wakil, bulan caruman dan bukti transaksi. AJK akan
            merekod dan menyemak bayaran untuk keluarga anda.
          </p>
          {settings.supportPhone ? (
            <a
              className="action-link mt-5"
              href={whatsappHref(
                settings.supportPhone,
                "Assalamualaikum, saya perlukan bantuan MyKhairat.",
              )}
              target="_blank"
              rel="noreferrer"
            >
              Hubungi AJK di WhatsApp
            </a>
          ) : (
            <p className="mt-4 rounded-xl bg-white p-4 text-slate-700">
              Gunakan nombor AJK dalam kumpulan WhatsApp keluarga. Nombor
              bantuan portal belum ditetapkan.
            </p>
          )}
        </div>
        <FamilyScene compact />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold">Lupa password?</h2>
          <p className="mt-3 text-slate-600">
            Minta AJK reset. Password awal ialah mykhairat dengan kod
            pengaktifan baharu. Tukar password selepas masuk.
          </p>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Bantuan kematian / wad</h2>
          <p className="mt-3 text-slate-600">
            Hubungi AJK dan serahkan bukti kejadian. AJK akan menyemak
            berdasarkan persetujuan keluarga.
          </p>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Perlu wakil ganti?</h2>
          <p className="mt-3 text-slate-600">
            AJK boleh menyediakan akses kepada ahli keluarga yang membantu anda,
            tanpa berkongsi password.
          </p>
        </Card>
      </div>
    </div>
  );
}
