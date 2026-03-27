import { useParams, Link } from 'react-router-dom';
import { useSchools } from '../hooks/useSchools';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, School, Users, BookOpen, Phone, Calendar, MapPin, Lock, User, Globe, ExternalLink } from 'lucide-react';

export default function SchoolDetail() {
  const { id } = useParams();
  const { schools, loading } = useSchools();
  const { isStaff } = useAuth();
  const school = schools.find(s => s.id === Number(id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <School size={48} className="mx-auto text-navy-300 mb-4" />
        <h2 className="text-xl font-bold text-navy-700 mb-2">학교를 찾을 수 없습니다</h2>
        <Link to="/map" className="btn-primary mt-4 inline-flex">
          지도에서 찾기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/map" className="btn-ghost text-sm mb-6 inline-flex">
        <ArrowLeft size={14} />
        목록으로 돌아가기
      </Link>

      {/* 학교 기본 정보 */}
      <div className="card p-6 md:p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-navy-700 mb-1">{school.name}</h2>
            <div className="flex items-center gap-2">
              <span className="badge-school badge-elementary">{school.type}</span>
              {school.subType && (
                <span className="text-xs text-navy-400">({school.subType})</span>
              )}
              <span className="text-xs text-navy-400">· {school.region}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <StatItem icon={Users} label="학생수" value={`${school.student_count}명`} />
          <StatItem icon={BookOpen} label="학급수" value={`${school.classes_count}학급`} />
          <StatItem icon={Calendar} label="개교일" value={school.established_date || '—'} />
          <StatItem icon={Phone} label="대표전화" value={school.main_phone || '—'} />
        </div>

        <div className="mt-4 space-y-2">
          {school.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={14} className="text-navy-400 mt-0.5 shrink-0" />
              <span className="text-navy-600">{school.address}</span>
            </div>
          )}
          {school.homepage && (
            <div className="flex items-center gap-2 text-sm">
              <Globe size={14} className="text-primary-500 shrink-0" />
              <a
                href={school.homepage.startsWith('http') ? school.homepage : `http://${school.homepage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600 hover:underline flex items-center gap-1"
              >
                학교 홈페이지 바로가기
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 교직원 연락처 */}
      <div className="card p-6 relative">
        <h3 className="font-bold text-navy-700 mb-4 flex items-center gap-2">
          <Phone size={16} className="text-primary-500" />
          교직원 연락처
        </h3>

        {isStaff ? (
          school.principal_name || school.vice_principal_name || school.admin_name ? (
            <div className="grid md:grid-cols-3 gap-4">
              <ContactCard role="교장" name={school.principal_name} phone={school.principal_phone} />
              <ContactCard role="교감" name={school.vice_principal_name} phone={school.vice_principal_phone} />
              <ContactCard role="행정실장" name={school.admin_name} phone={school.admin_phone} />
            </div>
          ) : (
            <p className="text-sm text-navy-400 py-4">연락처 정보가 없습니다.</p>
          )
        ) : (
          <div className="relative min-h-[120px]">
            <div className="locked-overlay rounded-lg">
              <Lock size={24} />
              <p className="text-sm font-medium">내부 직원 전용</p>
              <Link to="/login" className="text-xs text-primary-300 hover:text-primary-200 mt-1">
                @korea.kr 계정으로 로그인
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactCard({ role, name, phone }) {
  if (!name) return null;
  return (
    <div className="bg-surface-bg rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
          <User size={14} className="text-primary-600" />
        </div>
        <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
          {role}
        </span>
      </div>
      <p className="font-bold text-navy-700 text-sm">{name}</p>
      {phone && (
        <a
          href={`tel:${phone}`}
          className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1 mt-1"
        >
          <Phone size={11} />
          {phone}
        </a>
      )}
    </div>
  );
}

function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="text-center p-3 bg-surface-bg rounded-xl">
      <Icon size={18} className="mx-auto text-primary-500 mb-1.5" />
      <p className="text-lg font-bold text-navy-700">{value}</p>
      <p className="text-[11px] text-navy-400">{label}</p>
    </div>
  );
}
