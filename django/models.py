"""
VOXAI Hospital Management System (VOXAI-HMS)
Database Models (MySQL Compatible)
File: django/models.py
"""

from django.db import models
from django.utils import timezone


class Patient(models.Model):
    """
    Patient Table: Stores comprehensive demographics and contact information
    for registered hospital patients.
    """
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('U', 'Unknown'),
    ]

    patient_id = models.CharField(max_length=20, primary_key=True, help_text="Unique Patient Card Identifier (e.g., PAT1001)")
    name = models.CharField(max_length=150, db_index=True)
    age = models.IntegerField(null=True, blank=True)
    dob = models.DateField(null=True, blank=True, help_text="Date of Birth")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='U')
    contact = models.CharField(max_length=20, db_index=True, help_text="Phone or Mobile contact number")
    address = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patient'
        verbose_name = 'Patient'
        verbose_name_plural = 'Patients'

    def __str__(self):
        return f"{self.name} ({self.patient_id})"


class Doctor(models.Model):
    """
    Doctor Table: Core reference table for hospital clinicians and their medical specialty.
    """
    doctor_id = models.CharField(max_length=20, primary_key=True, help_text="Unique Doctor Staff ID (e.g., DOC201)")
    name = models.CharField(max_length=150)
    specialty = models.CharField(max_length=100, db_index=True, help_text="Medical specialty: e.g., Cardiology, Orthopedics")
    contact = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'doctor'
        verbose_name = 'Doctor'
        verbose_name_plural = 'Doctors'

    def __str__(self):
        return f"Dr. {self.name} ({self.specialty})"


class Attendance(models.Model):
    """
    Attendance / Schedule Status: Registers the availability of a physician on a given date.
    Ensures that appointments cannot be booked on days when a doctor is absent.
    """
    attendance_id = models.AutoField(primary_key=True)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField(db_index=True)
    is_available = models.BooleanField(default=True, help_text="Indicates if the doctor is on duty for this date")

    class Meta:
        db_table = 'doctor_attendance'
        unique_together = ('doctor', 'date')
        verbose_name = 'Doctor Attendance'
        verbose_name_plural = 'Doctor Attendances'

    def __str__(self):
        status = "On-Duty" if self.is_available else "Absent"
        return f"Dr. {self.doctor.name} - {self.date} - {status}"


class Appointment(models.Model):
    """
    Appointment Table: Registers verified appointments, matching patient, doctor, date, and schedule availability.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending Verification'),
        ('CONFIRMED', 'Confirmed'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    appointment_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='appointments')
    date = models.DateField(db_index=True)
    time_slot = models.TimeField(help_text="Scheduled slot (e.g., 11:30:00)")
    reason = models.TextField(null=True, blank=True, help_text="Reason for consultation or chief complaint")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='CONFIRMED')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointment'
        verbose_name = 'Appointment'
        verbose_name_plural = 'Appointments'

    def __str__(self):
        return f"Appt {self.appointment_id}: Patient {self.patient.name} with Dr. {self.doctor.name} on {self.date}"


class VoiceLog(models.Model):
    """
    VoiceLog (Telemetry & Auditing Table): Capture every raw audio/voice request transcribing text, 
    the parsed administrative intent, and generated TTS output text.
    """
    INTENT_CHOICES = [
        ('REGISTER', 'register_patient'),
        ('BOOK', 'book_appointment'),
        ('QUERY', 'query_info'),
        ('UNKNOWN', 'unknown_intent'),
    ]

    log_id = models.AutoField(primary_key=True)
    raw_text = models.TextField(help_text="Transcribed speech voice-to-text string")
    intent = models.CharField(max_length=20, choices=INTENT_CHOICES, default='UNKNOWN', db_index=True)
    response_text = models.TextField(help_text="Generated TTS textual response to read back to the user")
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = 'voice_log'
        ordering = ['-timestamp']
        verbose_name = 'Voice Interaction Log'
        verbose_name_plural = 'Voice Interaction Logs'

    def __str__(self):
        return f"VoiceLog #{self.log_id} [{self.intent}] at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"
