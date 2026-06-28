"""
VOXAI Hospital Management System (VOXAI-HMS)
Django REST Framework (DRF) Serializers
File: django/serializers.py
"""

from rest_framework import serializers
from .models import Patient, Doctor, Appointment, VoiceLog, Attendance


class PatientSerializer(serializers.ModelSerializer):
    """
    Serializer for parsing, validating and persisting Patient records.
    """
    class Meta:
        model = Patient
        fields = ['patient_id', 'name', 'age', 'dob', 'gender', 'contact', 'address', 'created_at']
        read_only_fields = ['created_at']

    def validate_contact(self, value):
        """Ensure clean mobile numbers are stored."""
        import re
        clean_value = re.sub(r'[\s\-()\\+]', '', value)
        if len(clean_value) < 7:
            raise serializers.ValidationError("Contact number must contain at least 7 digits.")
        return clean_value


class DoctorSerializer(serializers.ModelSerializer):
    """
    Serializer to expose list of clinicians and specialties.
    """
    class Meta:
        model = Doctor
        fields = ['doctor_id', 'name', 'specialty', 'contact']


class AttendanceSerializer(serializers.ModelSerializer):
    """
    Clinician Schedule validation records.
    """
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)

    class Meta:
        model = Attendance
        fields = ['attendance_id', 'doctor', 'doctor_name', 'date', 'is_available']


class AppointmentSerializer(serializers.ModelSerializer):
    """
    Appointment serialization incorporating relationship validations.
    """
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    doctor_specialty = serializers.CharField(source='doctor.specialty', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'appointment_id', 'patient', 'patient_name', 'doctor', 
            'doctor_name', 'doctor_specialty', 'date', 'time_slot', 'reason', 'status', 'created_at'
        ]
        read_only_fields = ['appointment_id', 'created_at']

    def validate(self, attrs):
        """
        Critical business-rule validation verifying Doctor exists and is on the 
        Attendance ledger as 'is_available' for the designated scheduling date.
        """
        doctor = attrs.get('doctor')
        date = attrs.get('date')

        # Check doctor availability
        attendance = Attendance.objects.filter(doctor=doctor, date=date).first()
        if not attendance or not attendance.is_available:
            raise serializers.ValidationError({
                "date": f"Dr. {doctor.name} is not available and has marked ABSENT on {date}."
            })
            
        return attrs


class VoiceLogSerializer(serializers.ModelSerializer):
    """
    Telemetry voice interaction schema logger.
    """
    class Meta:
        model = VoiceLog
        fields = ['log_id', 'raw_text', 'intent', 'response_text', 'timestamp']
        read_only_fields = ['log_id', 'timestamp']
