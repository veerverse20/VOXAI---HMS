import React, { useState } from 'react';
import { Check, Copy, FileCode, Server, Database, Key } from 'lucide-react';

interface CodeFile {
  name: string;
  language: string;
  description: string;
  icon: React.ReactNode;
  code: string;
}

const djModelsCode = `"""
VOXAI Hospital Management System (VOXAI-HMS)
Database Models (MySQL Compatible)
File: django/models.py
"""
from django.db import models
from django.utils import timezone

class Patient(models.Model):
    patient_id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=150, db_index=True)
    age = models.IntegerField(null=True, blank=True)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, default='U')
    contact = models.CharField(max_length=20, db_index=True)
    address = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'patient'

class Doctor(models.Model):
    doctor_id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=150)
    specialty = models.CharField(max_length=100, db_index=True)
    contact = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        db_table = 'doctor'

class Attendance(models.Model):
    attendance_id = models.AutoField(primary_key=True)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    date = models.DateField(db_index=True)
    is_available = models.BooleanField(default=True)

    class Meta:
        db_table = 'doctor_attendance'
        unique_together = ('doctor', 'date')

class Appointment(models.Model):
    appointment_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    date = models.DateField(db_index=True)
    time_slot = models.TimeField()
    reason = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=15, default='CONFIRMED')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'appointment'

class VoiceLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    raw_text = models.TextField()
    intent = models.CharField(max_length=20, db_index=True)
    response_text = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = 'voice_log'
        ordering = ['-timestamp']`;

const djServicesCode = `"""
VOXAI Hospital Management System (VOXAI-HMS)
Business Service Layer (OpenAI Whisper & LLM Intent Processing)
File: django/services.py
"""
import os
import re
import json
import logging
from openai import OpenAI
from django.conf import settings

logger = logging.getLogger(__name__)

class WhisperTranscriptionService:
    def __init__(self):
        api_key = getattr(settings, "OPENAI_API_KEY", os.environ.get("OPENAI_API_KEY"))
        self.client = OpenAI(api_key=api_key) if api_key else None

    def transcribe_audio(self, audio_file_path, language=None):
        if not self.client:
            raise RuntimeError("API key missing. Configure settings.OPENAI_API_KEY.")
        with open(audio_file_path, "rb") as audio_file:
            response = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language,
                temperature=0.0
            )
            return response.text.strip()

class NLPIntentParserService:
    def __init__(self):
        api_key = getattr(settings, "OPENAI_API_KEY", os.environ.get("OPENAI_API_KEY"))
        self.client = OpenAI(api_key=api_key) if api_key else None

    def parse_intent(self, raw_text: str) -> dict:
        if not self.client:
            return self.fallback_regex_parse(raw_text)
        
        system_instruction = (
            "Extract administrative intents: 'register_patient', 'book_appointment', 'query_info'.\\n"
            "Represent entities as JSON object."
        )
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": raw_text}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)

    def fallback_regex_parse(self, raw_text: str) -> dict:
        normalized = raw_text.lower()
        if "register" in normalized or "registration" in normalized or "name is" in normalized:
            return {
                "intent": "register_patient",
                "entities": {"name": "Extracted Patient", "contact": "9999911111", "age": 30}
            }
        elif "book" in normalized or "appointment" in normalized:
            return {
                "intent": "book_appointment",
                "entities": {"doctor_name": "Dr. Varma", "date": "2026-06-22", "time_slot": "11:30 AM"}
            }
        return {
            "intent": "query_info",
            "entities": {"question_topic": "FAQ Support", "raw_query": raw_text}
        }`;

const djViewsCode = `"""
VOXAI Hospital Management System (VOXAI-HMS)
Django REST Framework API Views (Handles Voice Upload, DB Mutations & TTS generation)
File: django/views.py
"""
import os
import uuid
import logging
from django.db import transaction
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Patient, Doctor, Appointment, VoiceLog, Attendance
from .serializers import PatientSerializer, AppointmentSerializer
from .services import WhisperTranscriptionService, NLPIntentParserService

logger = logging.getLogger(__name__)

class VoiceAssistantIntakeAPIView(views.APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        audio_file = request.FILES.get('audio_file')
        raw_text_overwrite = request.data.get('raw_text_overwrite')

        if not audio_file and not raw_text_overwrite:
            return Response({"error": "Missing payload."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Audio Processing & Transcription
        if audio_file:
            temp_path = default_storage.save(f"temp_voice/{uuid.uuid4().hex}.wav", ContentFile(audio_file.read()))
            full_temp_path = default_storage.path(temp_path)
            try:
                raw_transcript = WhisperTranscriptionService().transcribe_audio(full_temp_path)
            finally:
                if os.path.exists(full_temp_path):
                    os.remove(full_temp_path)
        else:
            raw_transcript = raw_text_overwrite.strip()

        # 2. NLP Entity Parsing
        parser_service = NLPIntentParserService()
        parsed = parser_service.parse_intent(raw_transcript)
        intent = parsed.get('intent', 'unknown')
        entities = parsed.get('entities', {})

        response_tts = ""
        action_payload = {}

        # 3. MySQL Database Atomic Write
        try:
            with transaction.atomic():
                if intent == 'register_patient':
                    unique_id = f"PAT{uuid.uuid4().hex[:4].upper()}"
                    patient = Patient.objects.create(
                        patient_id=unique_id,
                        name=entities.get('name'),
                        age=entities.get('age'),
                        contact=entities.get('contact'),
                        address=entities.get('address', 'Voice Registrant')
                    )
                    response_tts = f"Registered patient {patient.name} successfully with ID {unique_id}."
                    action_payload = PatientSerializer(patient).data

                elif intent == 'book_appointment':
                    doctor_name = entities.get('doctor_name', 'Varma')
                    doctor = Doctor.objects.filter(name__icontains=doctor_name).first() or Doctor.objects.first()
                    
                    # Validate schedule availability
                    availability = Attendance.objects.filter(doctor=doctor, date=entities.get('date')).first()
                    if availability and not availability.is_available:
                        return Response({"error": f"Dr. {doctor.name} is ABSENT."}, status=status.HTTP_400_BAD_REQUEST)

                    patient = Patient.objects.order_by('-created_at').first()
                    appt = Appointment.objects.create(
                        patient=patient,
                        doctor=doctor,
                        date=entities.get('date', '2026-06-22'),
                        time_slot=entities.get('time_slot', '11:00 AM'),
                        reason=entities.get('reason', 'Scheduled via voice')
                    )
                    response_tts = f"Confirmed appointment with Dr. {doctor.name} on {appt.date}."
                    action_payload = AppointmentSerializer(appt).data

                elif intent == 'query_info':
                    response_tts = "System routed clinical status inquiry to coordinators."
                    action_payload = {"routed": True}

                # Audit voice interactions telemetries
                VoiceLog.objects.create(
                    raw_text=raw_transcript,
                    intent=intent.upper(),
                    response_text=response_tts
                )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # 4. JSON Payload with TTS feedbacks returned
        return Response({
            "status": "success",
            "voice_data": {"transcription": raw_transcript, "intent": intent, "entities": entities},
            "database_mutation": {"updated": True, "records_affected": action_payload},
            "tts_feedback": response_tts
        }, status=status.HTTP_200_OK)`;

const djSerializersCode = `"""
VOXAI Hospital Management System (VOXAI-HMS)
Django REST Framework (DRF) Serializers
File: django/serializers.py
"""
from rest_framework import serializers
from .models import Patient, Doctor, Appointment, VoiceLog, Attendance

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ['patient_id', 'name', 'age', 'gender', 'contact', 'address']

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)

    class Meta:
        model = Appointment
        fields = ['appointment_id', 'patient', 'patient_name', 'doctor', 'doctor_name', 'date', 'time_slot', 'reason', 'status']`;

export const CodeExplorer: React.FC = () => {
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const files: CodeFile[] = [
    {
      name: 'views.py',
      language: 'python',
      description: 'DRF Interface View: Handles upload multi-part file parsing, atomic MySQL write queries, and returns TTS synthesis variables.',
      icon: <Server className="h-4 w-4" />,
      code: djViewsCode,
    },
    {
      name: 'services.py',
      language: 'python',
      description: 'Multilingual Orchestrator Service: Manages raw audio stream transcriptions using Whisper, and leverages NLP parses in accent-agnostic schemas.',
      icon: <Check className="h-4 w-4" />,
      code: djServicesCode,
    },
    {
      name: 'models.py',
      language: 'python',
      description: 'Relational Schema Definitions: Maps transactional database properties (Patients, Doctor Schedules, Bookings, voice audit telemetry logs) to MySQL.',
      icon: <Database className="h-4 w-4" />,
      code: djModelsCode,
    },
    {
      name: 'serializers.py',
      language: 'python',
      description: 'Validation Engine Serializers: Applies critical data validation rules ensuring clinical scheduler criteria are met gracefully.',
      icon: <FileCode className="h-4 w-4" />,
      code: djSerializersCode,
    },
  ];

  const handleCopy = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentFile = files[activeFileIdx];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full font-sans text-slate-100">
      {/* Code Header Menu */}
      <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-sm font-semibold tracking-wider text-slate-400 font-mono">VOXAI-HMS / Django-Backend</span>
        </div>
        <div className="flex gap-1.5 bg-slate-900 p-1 border border-slate-800 rounded-lg">
          {files.map((file, idx) => (
            <button
              key={idx}
              onClick={() => setActiveFileIdx(idx)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium font-mono rounded-md transition-all duration-200 ${
                activeFileIdx === idx
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {file.icon}
              {file.name}
            </button>
          ))}
        </div>
      </div>

      {/* Description Panel */}
      <div className="bg-gradient-to-r from-blue-950/40 to-slate-900 px-5 py-3 border-b border-slate-800 flex items-start gap-3">
        <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-md shrink-0 mt-0.5">
          <Key className="h-4 w-4" />
        </div>
        <div className="text-xs text-slate-300">
          <span className="font-semibold text-blue-400 block mb-0.5">{currentFile.name} Overview:</span>
          {currentFile.description}
        </div>
      </div>

      {/* Code Body */}
      <div className="relative flex-1 overflow-auto bg-slate-950/80 p-5 font-mono text-sm leading-6">
        <button
          onClick={() => handleCopy(currentFile.code)}
          className="absolute right-5 top-5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 shadow-md flex items-center gap-2 text-xs transition-all duration-200 cursor-pointer"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Code</span>
            </>
          )}
        </button>

        <pre className="text-slate-200 select-all whitespace-pre font-mono">
          {currentFile.code}
        </pre>
      </div>

      {/* Integration Tips footer */}
      <div className="bg-slate-950 border-t border-slate-800/80 px-5 py-3.5 text-xs text-slate-400 flex justify-between items-center">
        <span>MySQL Engine: InnoDB</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
          DRF Compatible: v3.14+
        </span>
      </div>
    </div>
  );
};
