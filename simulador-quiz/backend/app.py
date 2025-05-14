# backend/app.py

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event, func, asc 
from sqlalchemy.engine import Engine 
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
import json
from datetime import datetime
import random

# --- Configuración de la Aplicación ---
app = Flask(__name__)
CORS(app) 

basedir = os.path.abspath(os.path.dirname(__file__))
instance_folder = os.path.join(basedir, 'instance')
if not os.path.exists(instance_folder):
    os.makedirs(instance_folder)

UPLOAD_FOLDER = os.path.join(instance_folder, 'uploads', 'question_images')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(instance_folder, 'quiz.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Funciones de Utilidad ---
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite:///'):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON;")
        except Exception as e:
            app.logger.error(f"Error ejecutando PRAGMA foreign_keys=ON: {e}")
        finally:
            cursor.close()

# --- Tablas de Asociación ---
student_group_membership = db.Table('student_group_membership',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), primary_key=True),
    db.Column('student_group_id', db.Integer, db.ForeignKey('student_group.id', ondelete='CASCADE'), primary_key=True)
)

lesson_student_group_assignment = db.Table('lesson_student_group_assignment',
    db.Column('lesson_id', db.Integer, db.ForeignKey('lesson.id', ondelete='CASCADE'), primary_key=True),
    db.Column('student_group_id', db.Integer, db.ForeignKey('student_group.id', ondelete='CASCADE'), primary_key=True)
)

# --- Modelos de la Base de Datos ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombres = db.Column(db.String(100), nullable=True)
    apellidos = db.Column(db.String(100), nullable=True)
    edad = db.Column(db.Integer, nullable=True)
    correo = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='estudiante') 
    evaluations = db.relationship('Evaluation', backref='user', lazy='dynamic', cascade="all, delete-orphan")
    student_groups_joined = db.relationship('StudentGroup', secondary=student_group_membership, back_populates='members', lazy='dynamic')
    
    def set_password(self, password): self.password_hash = generate_password_hash(password)
    def check_password(self, password): return check_password_hash(self.password_hash, password)
    def __repr__(self): return f'<User {self.correo} (Role: {self.role})>'

class StudentGroup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    members = db.relationship('User', secondary=student_group_membership, back_populates='student_groups_joined', lazy='dynamic')
    # Relación con lecciones asignadas (ya definida por lesson_student_group_assignment y Lesson.assigned_student_groups)
    def __repr__(self): return f'<StudentGroup {self.name}>'

class QuestionGroup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    questions = db.relationship('Question', backref='group', lazy='dynamic', cascade="all, delete-orphan") 
    def __repr__(self): return f'<QuestionGroup {self.name}>'

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    texto_pregunta = db.Column(db.String(500), nullable=False)
    opciones = db.Column(db.String(1000), nullable=False) 
    respuesta_correcta_indice = db.Column(db.Integer, nullable=False)
    procedimiento_resolucion = db.Column(db.Text, nullable=True)
    question_group_id = db.Column(db.Integer, db.ForeignKey('question_group.id', ondelete='SET NULL'), nullable=True)
    imagen_url = db.Column(db.String(300), nullable=True)

    def to_dict_simple(self): 
        return {
            "id": self.id, 
            "texto_pregunta": self.texto_pregunta, 
            "opciones": json.loads(self.opciones) if self.opciones else [], 
            "respuesta_correcta_indice": self.respuesta_correcta_indice,
            "imagen_url": self.imagen_url,
        }
    def to_dict(self): 
        return {
            "id": self.id, 
            "texto_pregunta": self.texto_pregunta, 
            "opciones": json.loads(self.opciones) if self.opciones else [], 
            "respuesta_correcta_indice": self.respuesta_correcta_indice, 
            "procedimiento_resolucion": self.procedimiento_resolucion, 
            "question_group_id": self.question_group_id, 
            "group_name": self.group.name if self.group else None,
            "imagen_url": self.imagen_url
        }
    def __repr__(self): return f'<Question {self.texto_pregunta[:30]} (Group: {self.group.name if self.group else "Sin Grupo"})>'

class Evaluation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lesson.id', ondelete='SET NULL'), nullable=True) 
    score = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    answers = db.relationship('UserAnswer', backref='evaluation', lazy='dynamic', cascade="all, delete-orphan")
    lesson = db.relationship('Lesson', backref=db.backref('evaluations_taken', lazy='dynamic'))
    def __repr__(self): return f'<Evaluation ID: {self.id}, UserID: {self.user_id}, Score: {self.score}>'

class UserAnswer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    evaluation_id = db.Column(db.Integer, db.ForeignKey('evaluation.id', ondelete='CASCADE'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id', ondelete='CASCADE'), nullable=False) 
    selected_option_index = db.Column(db.Integer, nullable=False) 
    is_correct = db.Column(db.Boolean, nullable=False)
    question = db.relationship('Question', backref='user_answers') 
    def __repr__(self): return f'<UserAnswer EvalID: {self.evaluation_id}, QID: {self.question_id}, Correct: {self.is_correct}>'

class Lesson(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    configurations = db.relationship('LessonConfiguration', backref='lesson', lazy='dynamic', cascade="all, delete-orphan")
    assigned_student_groups = db.relationship('StudentGroup', secondary=lesson_student_group_assignment, lazy='dynamic',
                                             backref=db.backref('assigned_lessons', lazy='dynamic'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_all_possible_question_ids(self):
        ids = set()
        for config in self.configurations:
            if config.question_group: # Verificar que el grupo de preguntas exista
                for question in config.question_group.questions:
                    ids.add(question.id)
        return ids

    def to_dict(self, include_details=True): 
        data = {
            "id": self.id, "name": self.name, "description": self.description,
            "total_questions": sum(c.num_questions_to_select for c in self.configurations),
            "assigned_student_groups_count": self.assigned_student_groups.count(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_details:
            data["configurations"] = [config.to_dict() for config in self.configurations.order_by(LessonConfiguration.id).all()]
            data["assigned_student_group_ids"] = [group.id for group in self.assigned_student_groups.all()]
        return data
    def to_dict_for_student(self): 
        return {
            "id": self.id, "name": self.name, "description": self.description,
            "total_questions": sum(c.num_questions_to_select for c in self.configurations)
        }
    def __repr__(self): return f'<Lesson {self.name}>'

class LessonConfiguration(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lesson.id', ondelete='CASCADE'), nullable=False)
    question_group_id = db.Column(db.Integer, db.ForeignKey('question_group.id', ondelete='CASCADE'), nullable=False)
    num_questions_to_select = db.Column(db.Integer, nullable=False, default=1)
    time_per_question_seconds = db.Column(db.Integer, nullable=True, default=0) 
    question_group = db.relationship('QuestionGroup', backref=db.backref('lesson_configurations', lazy='dynamic'))
    def to_dict(self):
        return {
            "id": self.id, "lesson_id": self.lesson_id,
            "question_group_id": self.question_group_id,
            "question_group_name": self.question_group.name if self.question_group else None,
            "num_questions_to_select": self.num_questions_to_select,
            "time_per_question_seconds": self.time_per_question_seconds
        }
    def __repr__(self): return f'<LessonConfiguration lesson_id={self.lesson_id} qg_id={self.question_group_id}>'

# --- NUEVOS MODELOS PARA CICLOS DE PREGUNTAS ---
class UserLessonCycle(db.Model):
    __tablename__ = 'user_lesson_cycle'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lesson.id', ondelete='CASCADE'), nullable=False)
    current_cycle_number = db.Column(db.Integer, nullable=False, default=1)

    user = db.relationship('User', backref=db.backref('lesson_cycles', lazy='dynamic', cascade="all, delete-orphan"))
    lesson = db.relationship('Lesson', backref=db.backref('user_cycles', lazy='dynamic', cascade="all, delete-orphan"))

    __table_args__ = (db.UniqueConstraint('user_id', 'lesson_id', name='uq_user_lesson_cycle'),)

    def __repr__(self):
        return f'<UserLessonCycle UserID:{self.user_id}, LessonID:{self.lesson_id}, Cycle:{self.current_cycle_number}>'

class UserQuestionSeen(db.Model):
    __tablename__ = 'user_question_seen'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lesson.id', ondelete='CASCADE'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id', ondelete='CASCADE'), nullable=False)
    cycle_number = db.Column(db.Integer, nullable=False) 
    seen_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('questions_seen', lazy='dynamic', cascade="all, delete-orphan"))
    lesson = db.relationship('Lesson') 
    question = db.relationship('Question')

    __table_args__ = (db.UniqueConstraint('user_id', 'lesson_id', 'question_id', 'cycle_number', name='uq_user_lesson_question_cycle_seen'),)

    def __repr__(self):
        return f'<UserQuestionSeen U:{self.user_id} L:{self.lesson_id} Q:{self.question_id} C:{self.cycle_number}>'
# --- FIN DE NUEVOS MODELOS ---


# --- Ruta para servir imágenes ---
@app.route('/uploads/question_images/<filename>')
def uploaded_question_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# --- Rutas de API ---

@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data: return jsonify({"error": "No se recibieron datos"}), 400
    identifier = data.get('correo') 
    password = data.get('password')
    if not identifier or not password: return jsonify({"error": "Faltan correo/usuario o contraseña"}), 400
    user_db = User.query.filter_by(correo=identifier).first()
    if user_db and user_db.check_password(password):
        return jsonify({
            "message": "Login exitoso", 
            "access_token": "fake_jwt_token_v2_cycling", 
            "username": user_db.correo, 
            "user_id": user_db.id, 
            "role": user_db.role, 
            "nombres": user_db.nombres 
        }), 200
    return jsonify({"error": "Correo/usuario o contraseña incorrectos"}), 401

# --- RUTA DE PREGUNTAS MODIFICADA PARA CICLOS ---
@app.route('/api/questions', methods=['GET'])
def get_questions_for_quiz():
    lesson_id_str = request.args.get('lesson_id')
    user_id_str = request.args.get('user_id')

    if not lesson_id_str: 
        questions_from_db = Question.query.all()
        return jsonify([q.to_dict_simple() for q in questions_from_db])

    try:
        lesson_id = int(lesson_id_str)
        if not user_id_str: 
            return jsonify({"error": "User ID es requerido para obtener preguntas de una lección"}), 400
        user_id = int(user_id_str)
    except ValueError:
        return jsonify({"error": "Lesson ID o User ID inválido"}), 400

    user = User.query.get(user_id)
    if not user: return jsonify({"error": "Usuario no encontrado"}), 404
        
    lesson = Lesson.query.get(lesson_id)
    if not lesson: return jsonify({"error": "Lección no encontrada"}), 404
    
    user_lesson_cycle = UserLessonCycle.query.filter_by(user_id=user.id, lesson_id=lesson.id).first()
    if not user_lesson_cycle:
        user_lesson_cycle = UserLessonCycle(user_id=user.id, lesson_id=lesson.id, current_cycle_number=1)
        db.session.add(user_lesson_cycle) 
    
    current_cycle = user_lesson_cycle.current_cycle_number
    all_possible_question_ids_for_lesson = lesson.get_all_possible_question_ids()
    if not all_possible_question_ids_for_lesson:
        app.logger.warning(f"Lección {lesson_id} no tiene preguntas configuradas o sus grupos están vacíos.")
        return jsonify([])

    questions_to_select_per_group_config = []
    for config in lesson.configurations:
        if config.question_group: 
            questions_in_group = config.question_group.questions.all()
            questions_to_select_per_group_config.append({
                "group_id": config.question_group_id,
                "questions_in_group_objects": questions_in_group,
                "num_to_select": config.num_questions_to_select,
                "time_per_question": config.time_per_question_seconds
            })
        else:
            app.logger.warning(f"Configuración de lección {lesson_id} apunta a un grupo de preguntas no existente (ID: {config.question_group_id}).")

    total_questions_needed_for_lesson = sum(item['num_to_select'] for item in questions_to_select_per_group_config)
    if total_questions_needed_for_lesson == 0:
        app.logger.warning(f"Lección {lesson_id} está configurada para seleccionar 0 preguntas en total.")
        return jsonify([])

    seen_questions_this_cycle_db = UserQuestionSeen.query.filter_by(
        user_id=user.id, lesson_id=lesson.id, cycle_number=current_cycle
    ).all()
    seen_question_ids_this_cycle = {sq.question_id for sq in seen_questions_this_cycle_db}

    unseen_for_lesson_in_current_cycle = all_possible_question_ids_for_lesson - seen_question_ids_this_cycle
    
    if len(unseen_for_lesson_in_current_cycle) < total_questions_needed_for_lesson and len(all_possible_question_ids_for_lesson) > 0:
        current_cycle += 1
        user_lesson_cycle.current_cycle_number = current_cycle
        seen_question_ids_this_cycle = set() 
        app.logger.info(f"Usuario {user_id} avanzando al ciclo {current_cycle} para lección {lesson_id}")

    final_selected_question_dtos = [] 
    temp_seen_ids_this_session = set() 

    for group_config in questions_to_select_per_group_config:
        num_to_select = group_config["num_to_select"]
        if num_to_select == 0: continue

        all_q_in_group_objs = group_config["questions_in_group_objects"]
        candidates_unseen_cycle = [
            q for q in all_q_in_group_objs 
            if q.id not in seen_question_ids_this_cycle and q.id not in temp_seen_ids_this_session
        ]
        
        selected_for_this_group_batch_objs = []
        if len(candidates_unseen_cycle) >= num_to_select:
            selected_for_this_group_batch_objs = random.sample(candidates_unseen_cycle, num_to_select)
        else:
            selected_for_this_group_batch_objs.extend(candidates_unseen_cycle)
            remaining_needed = num_to_select - len(selected_for_this_group_batch_objs)
            if remaining_needed > 0:
                fallback_pool = [
                    q for q in all_q_in_group_objs 
                    if q.id not in temp_seen_ids_this_session and q.id not in [s.id for s in selected_for_this_group_batch_objs]
                ]
                if len(fallback_pool) >= remaining_needed:
                    selected_for_this_group_batch_objs.extend(random.sample(fallback_pool, remaining_needed))
                else: 
                    selected_for_this_group_batch_objs.extend(fallback_pool)
        
        for q_obj in selected_for_this_group_batch_objs:
            q_dict = q_obj.to_dict_simple()
            q_dict['time_per_question_seconds'] = group_config["time_per_question"]
            final_selected_question_dtos.append(q_dict) 
            temp_seen_ids_this_session.add(q_obj.id)

    random.shuffle(final_selected_question_dtos) 

    try:
        for q_data in final_selected_question_dtos:
            if q_data['id'] not in seen_question_ids_this_cycle: # Solo registrar si no estaba ya vista en este ciclo
                seen_entry = UserQuestionSeen(
                    user_id=user.id,
                    lesson_id=lesson.id,
                    question_id=q_data['id'],
                    cycle_number=current_cycle 
                )
                db.session.add(seen_entry)
        
        db.session.add(user_lesson_cycle) 
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error al registrar preguntas vistas o ciclo para user {user_id}, lesson {lesson_id}: {str(e)}")
        return jsonify({"error": "Error interno al procesar la lección y registrar vistas"}), 500
        
    return jsonify(final_selected_question_dtos)

@app.route('/api/submit_evaluation', methods=['POST'])
def submit_evaluation():
    data = request.get_json();
    if not data: return jsonify({"error": "No se recibieron datos"}), 400
    user_answers_frontend = data.get('answers')
    user_id_frontend = data.get('user_id')
    lesson_id_frontend = data.get('lesson_id')
    if not user_answers_frontend or user_id_frontend is None: return jsonify({"error": "Faltan respuestas o ID de usuario"}), 400
    user = User.query.get(user_id_frontend)
    if not user: return jsonify({"error": "Usuario no encontrado"}), 404
    lesson = None
    if lesson_id_frontend:
        lesson = Lesson.query.get(lesson_id_frontend)
    total_questions_answered = len(user_answers_frontend); correct_answers_count = 0
    new_evaluation = Evaluation(user_id=user.id, score=0, lesson_id=lesson.id if lesson else None); 
    db.session.add(new_evaluation); db.session.flush()
    incorrect_details_for_frontend = []
    for answer_data in user_answers_frontend:
        question_id = answer_data.get('question_id'); 
        selected_option_index = answer_data.get('selected_option_index') 
        
        question_db = Question.query.get(question_id)
        if not question_db: 
            total_questions_answered = max(0, total_questions_answered -1); 
            app.logger.warning(f"Pregunta ID {question_id} no encontrada durante la evaluación.")
            continue
        
        is_correct = (question_db.respuesta_correcta_indice == selected_option_index)

        if is_correct: correct_answers_count += 1
        else:
            try:
                options_list = json.loads(question_db.opciones) 
                your_answer_text = "No respondida"
                if selected_option_index != -1 and 0 <= selected_option_index < len(options_list):
                    your_answer_text = options_list[selected_option_index]
                elif selected_option_index == -1 : 
                     your_answer_text = "No respondida (tiempo agotado)"

                correct_answer_text = options_list[question_db.respuesta_correcta_indice]
            except Exception as e:
                app.logger.error(f"Error procesando opciones para pregunta {question_id}: {e}")
                your_answer_text, correct_answer_text = "Error procesando opciones", "Error procesando opciones"
            
            incorrect_details_for_frontend.append({
                "question_id": question_db.id, 
                "texto_pregunta": question_db.texto_pregunta, 
                "tu_respuesta_texto": your_answer_text, 
                "respuesta_correcta_texto": correct_answer_text, 
                "procedimiento": question_db.procedimiento_resolucion,
                "imagen_url": question_db.imagen_url
            })
        
        user_answer_entry = UserAnswer(evaluation_id=new_evaluation.id, question_id=question_db.id, selected_option_index=selected_option_index if selected_option_index is not None else -1, is_correct=is_correct)
        db.session.add(user_answer_entry)

    final_score = (correct_answers_count / total_questions_answered) * 100 if total_questions_answered > 0 else 0
    new_evaluation.score = round(final_score, 2)
    try: db.session.commit()
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al guardar la evaluación: {str(e)}"); return jsonify({"error": f"Error interno al guardar la evaluación"}), 500
    return jsonify({"message": "Evaluación procesada", "evaluation_id": new_evaluation.id, "score": new_evaluation.score, "total_questions": total_questions_answered, "correct_answers": correct_answers_count, "incorrect_details": incorrect_details_for_frontend}), 200

@app.route('/api/history', methods=['GET']) 
def get_history():
    user_id_param = request.args.get('user_id', type=int);
    if user_id_param is None: return jsonify({"error": "Falta user_id"}), 400
    user = User.query.get(user_id_param)
    if not user: return jsonify({"error": "Usuario no encontrado"}), 404
    evaluations_db = Evaluation.query.filter_by(user_id=user.id).order_by(Evaluation.timestamp.desc()).all()
    history_list = []
    for ev_db in evaluations_db:
        lesson_name = ev_db.lesson.name if ev_db.lesson else "Evaluación General"
        incorrect_answers_details = []
        user_answers_for_this_eval = UserAnswer.query.filter_by(evaluation_id=ev_db.id, is_correct=False).all()
        for ua_db in user_answers_for_this_eval:
            question_db = Question.query.get(ua_db.question_id)
            if question_db:
                try:
                    options_list = json.loads(question_db.opciones)
                    user_selected_text = options_list[ua_db.selected_option_index] if 0 <= ua_db.selected_option_index < len(options_list) else "Opción inválida o no respondida"
                    correct_answer_text = options_list[question_db.respuesta_correcta_indice]
                except Exception as e:
                    app.logger.error(f"Error procesando opciones en historial para pregunta {question_db.id}: {e}")
                    user_selected_text, correct_answer_text = "Error procesando opciones", "Error procesando opciones"
                incorrect_answers_details.append({
                    "question_id": question_db.id, 
                    "texto_pregunta": question_db.texto_pregunta, 
                    "tu_respuesta_texto": user_selected_text, 
                    "respuesta_correcta_texto": correct_answer_text, 
                    "procedimiento": question_db.procedimiento_resolucion,
                    "imagen_url": question_db.imagen_url
                })
        history_list.append({
            "evaluation_id": ev_db.id, "timestamp": ev_db.timestamp.isoformat(), "score": ev_db.score,
            "lesson_name": lesson_name, "lesson_id": ev_db.lesson_id, 
            "incorrect_answers_details": incorrect_answers_details
            })
    return jsonify(history_list)

# --- RUTAS DE ESTUDIANTE ---
@app.route('/api/student/assigned_lessons', methods=['GET'])
def get_student_assigned_lessons():
    user_id = request.args.get('user_id', type=int) 
    if not user_id: return jsonify({"error": "User ID es requerido"}), 400
    user = User.query.get(user_id)
    if not user: return jsonify({"error": "Usuario no encontrado"}), 404
    if user.role != 'estudiante': return jsonify({"error": "Acceso denegado. Solo para estudiantes."}), 403
    
    assigned_lessons_list = []; 
    lesson_ids_added = set() # Para evitar duplicados si un estudiante está en múltiples grupos asignados a la misma lección
    
    student_groups = user.student_groups_joined.all()
    for group in student_groups:
        for lesson in group.assigned_lessons: # 'assigned_lessons' es el backref de Lesson.assigned_student_groups
            if lesson.id not in lesson_ids_added:
                evaluations_for_lesson = Evaluation.query.filter_by(user_id=user.id, lesson_id=lesson.id).order_by(Evaluation.timestamp.asc()).all()
                attempts = len(evaluations_for_lesson)
                best_score = 0
                all_scores = []
                if attempts > 0:
                    best_score = max(ev.score for ev in evaluations_for_lesson)
                    all_scores = [ev.score for ev in evaluations_for_lesson]
                
                lesson_data = lesson.to_dict_for_student() # Usa el método del modelo Lesson
                lesson_data['attempts'] = attempts
                lesson_data['best_score'] = best_score
                lesson_data['all_scores'] = all_scores 
                lesson_data['status'] = "Pendiente" if attempts == 0 else "Intentada" 
                
                assigned_lessons_list.append(lesson_data)
                lesson_ids_added.add(lesson.id)
                
    return jsonify(sorted(assigned_lessons_list, key=lambda x: x['name']))

@app.route('/api/student/lessons_for_ranking_dropdown', methods=['GET'])
def get_lessons_for_ranking_dropdown():
    user_id = request.args.get('user_id', type=int)
    if not user_id: return jsonify({"error": "ID de usuario es requerido"}), 400
    user = User.query.get(user_id)
    if not user: return jsonify({"error": "Usuario no encontrado"}), 404

    lesson_ids = set()
    # Lecciones que el usuario ya ha intentado
    user_evals = Evaluation.query.filter_by(user_id=user.id).filter(Evaluation.lesson_id.isnot(None)).all()
    for ev in user_evals: lesson_ids.add(ev.lesson_id)
    
    # Lecciones asignadas a los grupos del usuario
    for group in user.student_groups_joined:
        for lesson in group.assigned_lessons: lesson_ids.add(lesson.id)
    
    lessons_for_dropdown = []
    if lesson_ids:
        lessons = Lesson.query.filter(Lesson.id.in_(list(lesson_ids))).order_by(Lesson.name).all()
        lessons_for_dropdown = [{"id": lesson.id, "name": lesson.name} for lesson in lessons]
        
    return jsonify(lessons_for_dropdown)

@app.route('/api/student/lesson_ranking_details/<int:lesson_id>', methods=['GET'])
def get_lesson_ranking_details(lesson_id):
    requesting_user_id = request.args.get('user_id', type=int)
    if not requesting_user_id: return jsonify({"error": "ID de usuario solicitante es requerido"}), 400
    
    requesting_user = User.query.get(requesting_user_id)
    if not requesting_user: return jsonify({"error": "Usuario solicitante no encontrado"}), 404
    
    lesson = Lesson.query.get_or_404(lesson_id)
    
    # Encontrar todos los IDs de grupos a los que pertenece el usuario solicitante
    user_group_ids = {group.id for group in requesting_user.student_groups_joined}
    
    # Encontrar todos los usuarios que comparten al menos un grupo con el usuario solicitante
    # Y que también tengan la lección asignada a través de alguno de sus grupos
    peer_user_ids = set()
    if user_group_ids:
        # Obtener todos los usuarios que están en los mismos grupos que el usuario solicitante
        peers_in_same_groups = User.query.join(student_group_membership).filter(
            student_group_membership.c.student_group_id.in_(user_group_ids)
        ).distinct().all() # distinct para no procesar el mismo peer múltiples veces

        for peer in peers_in_same_groups:
            # Verificar si la lección está asignada a alguno de los grupos del 'peer'
            is_lesson_assigned_to_peer_group = False
            for peer_group in peer.student_groups_joined: # Iterar sobre los grupos del peer
                if lesson in peer_group.assigned_lessons: # Verificar si la lección actual está en las lecciones asignadas de ese grupo
                    is_lesson_assigned_to_peer_group = True
                    break 
            if is_lesson_assigned_to_peer_group:
                peer_user_ids.add(peer.id) # Añadir ID del peer si la lección le está asignada
    else:
        # Si el usuario no está en ningún grupo, solo se mostrará su propio ranking (si tomó la lección)
        peer_user_ids.add(requesting_user_id)

    rankings = []
    for user_id_in_peer_group in peer_user_ids:
        user = User.query.get(user_id_in_peer_group)
        if not user: continue # Saltar si el usuario no se encuentra (poco probable)

        # Obtener solo el primer intento para esta lección y este usuario
        first_evaluation = Evaluation.query.filter_by(user_id=user.id, lesson_id=lesson.id).order_by(Evaluation.timestamp.asc()).first()
        
        if first_evaluation:
            rankings.append({
                "student_id": user.id,
                "student_name": f"{user.nombres or ''} {user.apellidos or ''}".strip() or user.correo, # Nombre completo o correo
                "first_attempt_score": first_evaluation.score,
                "timestamp": first_evaluation.timestamp.isoformat(), # Fecha del primer intento
                "is_current_user": user.id == requesting_user_id # Marcar si es el usuario que hizo la petición
            })
            
    # Ordenar por puntaje (descendente) y luego por fecha (ascendente, para desempates)
    sorted_rankings = sorted(rankings, key=lambda x: (-x["first_attempt_score"], x["timestamp"]))
    
    return jsonify({
        "lesson_id": lesson.id,
        "lesson_name": lesson.name,
        "rankings": sorted_rankings
    })

# --- RUTAS DE ADMINISTRACIÓN ---
@app.route('/api/admin/create_user', methods=['POST'])
def admin_create_user():
    data = request.get_json();
    if not data: return jsonify({"error": "No se recibieron datos"}), 400
    nombres = data.get('nombres'); apellidos = data.get('apellidos'); edad_str = data.get('edad'); correo = data.get('correo'); password = data.get('password'); role = data.get('role', 'estudiante'); admin_confirm_password = data.get('admin_confirm_password')
    if not all([nombres, apellidos, edad_str is not None, correo, password, role]): return jsonify({"error": "Faltan campos requeridos"}), 400
    try:
        edad = int(edad_str)
        if edad < 0: raise ValueError("La edad no puede ser negativa")
    except ValueError: return jsonify({"error": "La edad debe ser un número entero no negativo"}), 400
    if User.query.filter_by(correo=correo).first(): return jsonify({"error": "Un usuario con este correo ya existe"}), 409
    if role == 'administrador':
        # En un sistema real, aquí se verificaría admin_confirm_password contra la contraseña del admin actual
        if not admin_confirm_password: 
            app.logger.warning("Intento de crear admin sin admin_confirm_password, pero se permite por ahora para desarrollo.")
            # return jsonify({"error": "Contraseña de confirmación del administrador actual requerida para crear otro administrador"}), 403
    new_user = User(nombres=nombres, apellidos=apellidos, edad=edad, correo=correo, role=role); new_user.set_password(password); db.session.add(new_user)
    try: db.session.commit(); return jsonify({"message": f"Usuario '{new_user.correo}' creado.", "user": {"id": new_user.id, "nombres": new_user.nombres, "apellidos": new_user.apellidos, "correo": new_user.correo, "edad": new_user.edad, "role": new_user.role}}), 201
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al crear usuario: {str(e)}"); return jsonify({"error": f"Error interno al crear usuario"}), 500

@app.route('/api/admin/question_groups', methods=['POST'])
def admin_create_question_group():
    data = request.get_json(); name = data.get('name');
    if not name or not name.strip(): return jsonify({"error": "Nombre de grupo requerido"}), 400
    if QuestionGroup.query.filter_by(name=name).first(): return jsonify({"error": "Grupo con este nombre ya existe"}), 409
    new_group = QuestionGroup(name=name); db.session.add(new_group)
    try: db.session.commit(); return jsonify({"id": new_group.id, "name": new_group.name, "message": "Grupo de preguntas creado", "question_count": 0}), 201
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al crear grupo de preguntas: {str(e)}"); return jsonify({"error": "Error interno al crear grupo de preguntas"}), 500

@app.route('/api/admin/question_groups', methods=['GET'])
def admin_get_question_groups():
    groups = QuestionGroup.query.order_by(QuestionGroup.name).all();
    return jsonify([{
        "id": group.id, 
        "name": group.name,
        "question_count": group.questions.count() # Contar preguntas asociadas
    } for group in groups])

@app.route('/api/admin/question_groups/<int:group_id>', methods=['PUT'])
def admin_update_question_group(group_id):
    group = QuestionGroup.query.get_or_404(group_id)
    data = request.get_json(); name = data.get('name')
    if not name or not name.strip(): return jsonify({"error": "El nombre del grupo es requerido"}), 400
    if name != group.name and QuestionGroup.query.filter_by(name=name).first(): return jsonify({"error": "Un grupo de preguntas con este nombre ya existe"}), 409
    group.name = name
    try: db.session.commit(); return jsonify({"id": group.id, "name": group.name, "message": "Grupo de preguntas actualizado"}), 200
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al actualizar grupo de preguntas: {str(e)}"); return jsonify({"error": f"Error interno al actualizar grupo de preguntas"}), 500

@app.route('/api/admin/question_groups/<int:group_id>', methods=['DELETE'])
def admin_delete_question_group(group_id):
    group = QuestionGroup.query.get_or_404(group_id)
    # Las preguntas asociadas tendrán su question_group_id puesto a NULL debido a ondelete='SET NULL'
    db.session.delete(group)
    try: db.session.commit(); return jsonify({"message": f"Grupo de preguntas '{group.name}' eliminado. Las preguntas asociadas ahora no tienen grupo."}), 200
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al eliminar grupo de preguntas: {str(e)}"); return jsonify({"error": f"Error interno al eliminar grupo de preguntas"}), 500

@app.route('/api/admin/questions', methods=['POST'])
def admin_add_question():
    imagen_url_guardada = None
    if 'imagen_pregunta' in request.files:
        file = request.files['imagen_pregunta']
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            imagen_url_guardada = f'question_images/{unique_filename}'
    
    texto_pregunta = request.form.get('texto_pregunta')
    opciones_raw = request.form.get('opciones') 
    respuesta_correcta_indice_str = request.form.get('respuesta_correcta_indice')
    procedimiento_resolucion = request.form.get('procedimiento_resolucion')
    question_group_id_str = request.form.get('question_group_id')

    if not texto_pregunta or not texto_pregunta.strip(): return jsonify({"error": "El texto de la pregunta es requerido"}),400
    
    opciones_list = []
    if opciones_raw:
        opciones_list = [opt.strip() for opt in opciones_raw.split(',') if opt.strip()]
    if not opciones_list or len(opciones_list) < 1: return jsonify({"error": "Debe haber al menos una opción válida"}), 400

    try:
        respuesta_correcta_indice = int(respuesta_correcta_indice_str)
        if not (0 <= respuesta_correcta_indice < len(opciones_list)): return jsonify({"error": "Índice de respuesta correcta fuera de rango"}), 400
    except (ValueError, TypeError): return jsonify({"error": "Índice de respuesta correcta debe ser un número"}), 400
    
    question_group_id = None
    if question_group_id_str and question_group_id_str != 'null' and question_group_id_str != '': 
        try:
            question_group_id = int(question_group_id_str)
            if not QuestionGroup.query.get(question_group_id): return jsonify({"error": "Grupo de preguntas no encontrado"}), 404
        except ValueError: return jsonify({"error": "ID de grupo de preguntas inválido"}), 400

    new_question = Question(
        texto_pregunta=texto_pregunta, 
        opciones=json.dumps(opciones_list), 
        respuesta_correcta_indice=respuesta_correcta_indice, 
        procedimiento_resolucion=procedimiento_resolucion, 
        question_group_id=question_group_id,
        imagen_url=imagen_url_guardada
    )
    db.session.add(new_question)
    try: 
        db.session.commit()
        return jsonify(new_question.to_dict()), 201
    except Exception as e: 
        db.session.rollback()
        app.logger.error(f"Error al añadir pregunta: {str(e)}")
        if imagen_url_guardada:
            try:
                os.remove(os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(imagen_url_guardada)))
            except OSError as oe:
                app.logger.error(f"Error al borrar imagen huérfana {imagen_url_guardada}: {oe}")
        return jsonify({"error": "Error interno al añadir pregunta"}), 500

# Esta ruta es para la GESTIÓN de preguntas por el admin, no para el quiz en sí
@app.route('/api/admin/questions', methods=['GET']) 
def admin_get_questions_management():
    group_id_filter = request.args.get('question_group_id', type=int)
    query = Question.query
    if group_id_filter: query = query.filter_by(question_group_id=group_id_filter)
    questions_db = query.order_by(Question.id.desc()).all()
    return jsonify([q.to_dict() for q in questions_db]) 

@app.route('/api/admin/questions/<int:question_id>', methods=['GET'])
def admin_get_single_question(question_id):
    question = Question.query.get_or_404(question_id)
    return jsonify(question.to_dict())

@app.route('/api/admin/questions/<int:question_id>', methods=['PUT'])
def admin_update_question(question_id):
    question = Question.query.get_or_404(question_id)
    
    imagen_url_actualizada = question.imagen_url
    eliminar_imagen_actual_flag = request.form.get('eliminar_imagen_actual') == 'true'

    if eliminar_imagen_actual_flag and question.imagen_url:
        try:
            image_path_to_delete = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(question.imagen_url))
            if os.path.exists(image_path_to_delete):
                 os.remove(image_path_to_delete)
            imagen_url_actualizada = None
        except OSError as e:
            app.logger.error(f"Error al eliminar imagen existente {question.imagen_url}: {e}")

    if 'imagen_pregunta' in request.files:
        file = request.files['imagen_pregunta']
        if file and allowed_file(file.filename):
            if question.imagen_url and question.imagen_url != imagen_url_actualizada: 
                 try:
                    old_image_path = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(question.imagen_url))
                    if os.path.exists(old_image_path):
                        os.remove(old_image_path)
                 except OSError as e:
                    app.logger.error(f"Error al eliminar imagen antigua {question.imagen_url} durante la actualización: {e}")
            
            filename = secure_filename(file.filename)
            unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            imagen_url_actualizada = f'question_images/{unique_filename}'

    question.imagen_url = imagen_url_actualizada

    texto_pregunta = request.form.get('texto_pregunta')
    if texto_pregunta is not None: 
        if not texto_pregunta.strip(): return jsonify({"error": "El texto de la pregunta no puede estar vacío"}),400
        question.texto_pregunta = texto_pregunta
    
    opciones_raw = request.form.get('opciones')
    if opciones_raw is not None:
        opciones_list = [opt.strip() for opt in opciones_raw.split(',') if opt.strip()]
        if not opciones_list or len(opciones_list) < 1: return jsonify({"error": "Formato de opciones inválido o menos de 1 opción"}), 400
        question.opciones = json.dumps(opciones_list)
        
        respuesta_correcta_indice_str = request.form.get('respuesta_correcta_indice')
        if respuesta_correcta_indice_str is not None:
            try:
                respuesta_correcta_indice = int(respuesta_correcta_indice_str)
                if not (0 <= respuesta_correcta_indice < len(opciones_list)): return jsonify({"error": "Índice de respuesta correcta fuera de rango para las opciones dadas"}), 400
                question.respuesta_correcta_indice = respuesta_correcta_indice
            except (ValueError, TypeError): return jsonify({"error": "Índice de respuesta correcta debe ser un número"}), 400
    
    procedimiento_resolucion = request.form.get('procedimiento_resolucion')
    if procedimiento_resolucion is not None: question.procedimiento_resolucion = procedimiento_resolucion
    
    question_group_id_str = request.form.get('question_group_id')
    if question_group_id_str is not None:
        if question_group_id_str == 'null' or question_group_id_str == '':
            question.question_group_id = None
        else:
            try:
                qg_id = int(question_group_id_str)
                if not QuestionGroup.query.get(qg_id): return jsonify({"error": "Grupo de preguntas no encontrado al actualizar"}), 404
                question.question_group_id = qg_id
            except ValueError: return jsonify({"error": "ID de grupo de preguntas inválido al actualizar"}), 400
            
    try: 
        db.session.commit(); 
        return jsonify(question.to_dict()), 200
    except Exception as e: 
        db.session.rollback(); 
        app.logger.error(f"Error al actualizar pregunta: {str(e)}"); 
        return jsonify({"error": "Error interno al actualizar pregunta"}), 500

@app.route('/api/admin/questions/<int:question_id>', methods=['DELETE'])
def admin_delete_question(question_id):
    question = Question.query.get_or_404(question_id); 
    if question.imagen_url:
        try:
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(question.imagen_url))
            if os.path.exists(image_path):
                os.remove(image_path)
        except OSError as e:
            app.logger.error(f"Error al eliminar imagen {question.imagen_url} de la pregunta {question_id}: {e}")

    db.session.delete(question)
    try: db.session.commit(); return jsonify({"message": f"Pregunta ID {question_id} eliminada."}), 200
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al eliminar pregunta: {str(e)}"); return jsonify({"error": "Error interno al eliminar pregunta"}), 500

@app.route('/api/admin/users/all', methods=['GET'])
def admin_get_all_users():
    users_db = User.query.order_by(User.nombres, User.apellidos).all()
    users_list = [{"id": user.id, "nombres": user.nombres, "apellidos": user.apellidos, "correo": user.correo, "edad": user.edad, "role": user.role} for user in users_db]
    return jsonify(users_list)

@app.route('/api/admin/users', methods=['GET']) 
def admin_get_users():
    role_filter = request.args.get('role');
    query = User.query
    if role_filter: query = query.filter_by(role=role_filter)
    users_db = query.order_by(User.nombres, User.apellidos).all()
    users_list = [{"id": user.id, "nombres": user.nombres, "apellidos": user.apellidos, "correo": user.correo, "edad": user.edad, "role": user.role} for user in users_db]
    return jsonify(users_list)

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
def admin_update_user(user_id):
    user = User.query.get_or_404(user_id); data = request.get_json()
    if not data: return jsonify({"error": "No se recibieron datos"}), 400
    if 'nombres' in data: user.nombres = data['nombres']
    if 'apellidos' in data: user.apellidos = data['apellidos']
    if 'edad' in data:
        try:
            edad_val = data['edad']
            if edad_val is None or edad_val == '': user.edad = None
            else:
                edad_int = int(edad_val)
                if edad_int >= 0: user.edad = edad_int
                else: return jsonify({"error": "La edad debe ser un número no negativo"}), 400
        except (ValueError, TypeError): return jsonify({"error": "La edad debe ser un número válido o estar vacía"}), 400
    if 'correo' in data:
        if data['correo'] != user.correo and User.query.filter(User.id != user_id, User.correo == data['correo']).first(): return jsonify({"error": "Este correo ya está en uso por otro usuario"}), 409
        user.correo = data['correo']
    if 'role' in data:
        if data['role'] in ['estudiante', 'administrador']: user.role = data['role']
        else: return jsonify({"error": "Rol inválido. Debe ser 'estudiante' o 'administrador'"}), 400
    try: db.session.commit(); return jsonify({"message": "Usuario actualizado", "user": {"id": user.id, "nombres": user.nombres, "apellidos": user.apellidos, "correo": user.correo, "edad": user.edad, "role": user.role}}), 200
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al actualizar usuario: {str(e)}"); return jsonify({"error": "Error interno al actualizar usuario"}), 500

@app.route('/api/admin/users/<int:user_id>/password', methods=['PUT'])
def admin_change_user_password(user_id):
    user = User.query.get_or_404(user_id); data = request.get_json(); new_password = data.get('new_password')
    if not new_password: return jsonify({"error": "Nueva contraseña requerida"}), 400
    if len(new_password) < 6: return jsonify({"error": "La nueva contraseña debe tener al menos 6 caracteres"}), 400
    user.set_password(new_password)
    try: db.session.commit(); return jsonify({"message": f"Contraseña para el usuario '{user.correo}' actualizada exitosamente."}), 200
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al cambiar contraseña: {str(e)}"); return jsonify({"error": "Error interno al cambiar la contraseña"}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
def admin_delete_user(user_id):
    user = User.query.get_or_404(user_id); 
    db.session.delete(user)
    try: db.session.commit(); return jsonify({"message": f"Usuario '{user.correo}' y todos sus datos asociados han sido eliminados."}), 200
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al eliminar usuario: {str(e)}"); return jsonify({"error": "Error interno al eliminar el usuario"}), 500

@app.route('/api/admin/student_groups', methods=['POST'])
def admin_create_student_group():
    data = request.get_json(); name = data.get('name'); description = data.get('description', '')
    if not name or not name.strip(): return jsonify({"error": "Nombre de grupo requerido"}), 400
    if StudentGroup.query.filter_by(name=name).first(): return jsonify({"error": "Un grupo de estudiantes con este nombre ya existe"}), 409
    new_student_group = StudentGroup(name=name, description=description); db.session.add(new_student_group)
    try: db.session.commit(); return jsonify({"id": new_student_group.id, "name": new_student_group.name, "description": new_student_group.description, "message": "Grupo de estudiantes creado", "member_count": 0 }), 201
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al crear grupo de estudiantes: {str(e)}"); return jsonify({"error": "Error interno al crear grupo de estudiantes"}), 500

@app.route('/api/admin/student_groups', methods=['GET'])
def admin_get_student_groups(): 
    groups_db = StudentGroup.query.order_by(StudentGroup.name).all()
    return jsonify([{"id": group.id, "name": group.name, "description": group.description, "member_count": group.members.count()} for group in groups_db])

@app.route('/api/admin/student_groups/<int:group_id>/members', methods=['GET'])
def admin_get_student_group_members(group_id):
    student_group = StudentGroup.query.get_or_404(group_id)
    members_list = [{"id": user.id, "nombres": user.nombres, "apellidos": user.apellidos, "correo": user.correo} 
                    for user in student_group.members.order_by(User.nombres, User.apellidos).all()]
    return jsonify(members_list)

@app.route('/api/admin/student_groups/<int:group_id>/members', methods=['POST'])
def admin_add_student_to_group(group_id):
    data = request.get_json(); user_id_str = data.get('user_id');
    if not user_id_str: return jsonify({"error": "ID de usuario requerido"}), 400
    try: user_id = int(user_id_str)
    except ValueError: return jsonify({"error": "ID de usuario inválido"}), 400
    student_group = StudentGroup.query.get_or_404(group_id); user = User.query.get_or_404(user_id)
    if user.role != 'estudiante': return jsonify({"error": "Solo los usuarios con rol 'estudiante' pueden ser añadidos a grupos de estudiantes."}), 400
    if user in student_group.members: return jsonify({"message": "El estudiante ya es miembro de este grupo."}), 200
    student_group.members.append(user)
    try: db.session.commit(); return jsonify({"message": f"Estudiante '{user.nombres} {user.apellidos}' añadido al grupo '{student_group.name}'."}), 200
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al añadir estudiante a grupo: {str(e)}"); return jsonify({"error": "Error interno al añadir estudiante al grupo"}), 500

@app.route('/api/admin/student_groups/<int:group_id>/members/<int:user_id>', methods=['DELETE'])
def admin_remove_student_from_group(group_id, user_id):
    student_group = StudentGroup.query.get_or_404(group_id); user = User.query.get_or_404(user_id);
    if user not in student_group.members: return jsonify({"error": "El estudiante no es miembro de este grupo."}), 404
    student_group.members.remove(user)
    try: db.session.commit(); return jsonify({"message": f"Estudiante '{user.nombres} {user.apellidos}' eliminado del grupo '{student_group.name}'."}), 200
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al quitar estudiante de grupo: {str(e)}"); return jsonify({"error": "Error interno al quitar estudiante del grupo"}), 500

@app.route('/api/admin/student_groups/<int:group_id>', methods=['DELETE'])
def admin_delete_student_group(group_id):
    student_group = StudentGroup.query.get_or_404(student_group_id=group_id); # Corregido: get_or_404(group_id)
    db.session.delete(student_group)
    try: db.session.commit(); return jsonify({"message": f"Grupo de estudiantes '{student_group.name}' eliminado."}), 200
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al eliminar grupo de estudiantes: {str(e)}"); return jsonify({"error": "Error interno al eliminar el grupo de estudiantes"}), 500

@app.route('/api/admin/lessons', methods=['POST'])
def admin_create_lesson():
    data = request.get_json()
    if not data: return jsonify({"error": "No se recibieron datos"}), 400
    name = data.get('name'); description = data.get('description'); configurations_data = data.get('configurations', []); assigned_student_group_ids_data = data.get('assigned_student_group_ids', [])
    if not name or not name.strip(): return jsonify({"error": "El nombre de la lección es obligatorio"}), 400
    if not configurations_data: return jsonify({"error": "Se requiere al menos una configuración de preguntas para la lección"}), 400
    new_lesson = Lesson(name=name, description=description); db.session.add(new_lesson); db.session.flush() 
    for config_data in configurations_data:
        qg_id = config_data.get('question_group_id'); num_q = config_data.get('num_questions_to_select'); time_q = config_data.get('time_per_question_seconds', 0)
        if not qg_id or num_q is None or int(num_q) <= 0: db.session.rollback(); return jsonify({"error": "Configuración de grupo inválida: falta ID de grupo de preguntas o N° de preguntas es <= 0"}), 400
        if not QuestionGroup.query.get(qg_id): db.session.rollback(); return jsonify({"error": f"Grupo de preguntas con ID {qg_id} no encontrado"}), 404
        new_config = LessonConfiguration(lesson_id=new_lesson.id, question_group_id=qg_id, num_questions_to_select=int(num_q), time_per_question_seconds=int(time_q))
        db.session.add(new_config)
    if assigned_student_group_ids_data:
        for sg_id in assigned_student_group_ids_data:
            student_group = StudentGroup.query.get(sg_id)
            if student_group: new_lesson.assigned_student_groups.append(student_group)
            else: app.logger.warning(f"Grupo de estudiantes con ID {sg_id} no encontrado al crear lección {new_lesson.name}.")
    try: db.session.commit(); return jsonify({"message": "Lección creada exitosamente", "lesson": new_lesson.to_dict()}), 201
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al crear lección: {str(e)}"); return jsonify({"error": f"Error interno al crear la lección: {str(e)}"}), 500

@app.route('/api/admin/lessons', methods=['GET'])
def admin_get_lessons():
    lessons_db = Lesson.query.order_by(Lesson.name).all()
    return jsonify([lesson.to_dict() for lesson in lessons_db]) # Usar to_dict() para detalles completos

@app.route('/api/admin/lessons/<int:lesson_id>', methods=['GET'])
def admin_get_lesson(lesson_id):
    lesson = Lesson.query.get_or_404(lesson_id)
    return jsonify(lesson.to_dict()) # Usar to_dict() para detalles completos

@app.route('/api/admin/lessons/<int:lesson_id>', methods=['PUT'])
def admin_update_lesson(lesson_id):
    lesson = Lesson.query.get_or_404(lesson_id); data = request.get_json()
    if not data: return jsonify({"error": "No se recibieron datos"}), 400
    lesson.name = data.get('name', lesson.name).strip()
    if not lesson.name: return jsonify({"error": "El nombre de la lección no puede estar vacío"}), 400
    lesson.description = data.get('description', lesson.description)
    configurations_data = data.get('configurations')
    if configurations_data is not None: 
        if not configurations_data: db.session.rollback(); return jsonify({"error": "Una lección debe tener al menos una configuración de preguntas"}), 400
        LessonConfiguration.query.filter_by(lesson_id=lesson.id).delete() # Eliminar configuraciones antiguas
        for config_data in configurations_data:
            qg_id = config_data.get('question_group_id'); num_q = config_data.get('num_questions_to_select'); time_q = config_data.get('time_per_question_seconds', 0)
            if not qg_id or num_q is None or int(num_q) <= 0: db.session.rollback(); return jsonify({"error": "Configuración de grupo inválida al actualizar: falta ID o N° de preguntas <= 0"}), 400
            if not QuestionGroup.query.get(qg_id): db.session.rollback(); return jsonify({"error": f"Grupo de preguntas con ID {qg_id} no encontrado al actualizar"}), 404
            new_config = LessonConfiguration(lesson_id=lesson.id, question_group_id=qg_id, num_questions_to_select=int(num_q), time_per_question_seconds=int(time_q))
            db.session.add(new_config)
    assigned_student_group_ids_data = data.get('assigned_student_group_ids')
    if assigned_student_group_ids_data is not None: 
        lesson.assigned_student_groups = [] # Limpiar asignaciones antiguas
        for sg_id in assigned_student_group_ids_data:
            student_group = StudentGroup.query.get(sg_id)
            if student_group: lesson.assigned_student_groups.append(student_group)
            else: app.logger.warning(f"Grupo de estudiantes con ID {sg_id} no encontrado al actualizar lección {lesson.name}.")
    lesson.updated_at = datetime.utcnow()
    try: db.session.commit(); return jsonify({"message": "Lección actualizada exitosamente", "lesson": lesson.to_dict()}), 200
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al actualizar lección: {str(e)}"); return jsonify({"error": f"Error interno al actualizar la lección: {str(e)}"}), 500

@app.route('/api/admin/lessons/<int:lesson_id>', methods=['DELETE'])
def admin_delete_lesson(lesson_id):
    lesson = Lesson.query.get_or_404(lesson_id)
    db.session.delete(lesson) # Las configuraciones y asignaciones se borrarán en cascada
    try: db.session.commit(); return jsonify({"message": f"Lección '{lesson.name}' eliminada exitosamente"}), 200
    except Exception as e: db.session.rollback(); app.logger.error(f"Error al eliminar lección: {str(e)}"); return jsonify({"error": f"Error interno al eliminar la lección: {str(e)}"}), 500

@app.route('/api/admin/statistics/student_groups_overview', methods=['GET'])
def admin_get_student_groups_overview():
    groups = StudentGroup.query.order_by(StudentGroup.name).all()
    overview_data = []
    for group in groups:
        overview_data.append({
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "member_count": group.members.count()
            # Podrías añadir más estadísticas agregadas por grupo aquí si es necesario
        })
    return jsonify(overview_data)

@app.route('/api/admin/statistics/group/<int:group_id>', methods=['GET'])
def admin_get_group_statistics(group_id):
    student_group = StudentGroup.query.get_or_404(group_id)
    group_info = {
        "id": student_group.id, "name": student_group.name,
        "description": student_group.description, "member_count": student_group.members.count()
    }
    members_performance = []; all_evaluations_scores_group = []
    total_questions_answered_group_level = 0; total_correct_answers_group_level = 0
    performance_by_qg_group_level = {} 

    for member in student_group.members:
        member_evaluations = member.evaluations.all() # Obtener todas las evaluaciones del miembro
        member_total_evals_count = len(member_evaluations)
        member_avg_score = 0
        if member_total_evals_count > 0:
            member_avg_score = round(sum(ev.score for ev in member_evaluations) / member_total_evals_count, 2)
            all_evaluations_scores_group.extend([ev.score for ev in member_evaluations])
        
        members_performance.append({
            "student_id": member.id, "student_name": f"{member.nombres or ''} {member.apellidos or ''}".strip() or member.correo,
            "evaluations_taken": member_total_evals_count, "average_score": member_avg_score
        })

        for ev in member_evaluations: # Iterar sobre cada evaluación del miembro
            current_answers = ev.answers.all() 
            for answer in current_answers:
                total_questions_answered_group_level += 1
                if answer.is_correct: total_correct_answers_group_level += 1
                
                question = Question.query.get(answer.question_id)
                if question and question.question_group_id:
                    qg_id = question.question_group_id
                    if qg_id not in performance_by_qg_group_level:
                        qg = QuestionGroup.query.get(qg_id)
                        qg_name = qg.name if qg else "Desconocido"
                        performance_by_qg_group_level[qg_id] = {
                            "question_group_id": qg_id, 
                            "question_group_name": qg_name, 
                            "total_answered_in_group": 0, 
                            "total_correct_in_group": 0
                        }
                    performance_by_qg_group_level[qg_id]["total_answered_in_group"] += 1
                    if answer.is_correct: performance_by_qg_group_level[qg_id]["total_correct_in_group"] += 1
    
    overall_statistics = {
        "total_evaluations_taken": len(all_evaluations_scores_group),
        "average_score": round(sum(all_evaluations_scores_group) / len(all_evaluations_scores_group), 2) if all_evaluations_scores_group else 0,
        "total_questions_answered": total_questions_answered_group_level,
        "total_correct": total_correct_answers_group_level,
        "total_incorrect": total_questions_answered_group_level - total_correct_answers_group_level
    }
    
    final_performance_by_qg_list = []
    for qg_id, data in performance_by_qg_group_level.items():
        accuracy = round((data["total_correct_in_group"] / data["total_answered_in_group"]) * 100, 2) if data["total_answered_in_group"] > 0 else 0
        final_performance_by_qg_list.append({**data, "accuracy_percentage": accuracy})
        
    return jsonify({
        "group_info": group_info, 
        "overall_statistics": overall_statistics,
        "members_performance": sorted(members_performance, key=lambda x: x["student_name"]),
        "performance_by_question_group": sorted(final_performance_by_qg_list, key=lambda x: x["question_group_name"])
    })

@app.route('/api/admin/lesson_statistics/<int:lesson_id>', methods=['GET'])
def get_admin_lesson_statistics(lesson_id):
    lesson = Lesson.query.get_or_404(lesson_id)
    
    total_attempts = lesson.evaluations_taken.count()
    all_scores_for_lesson = [ev.score for ev in lesson.evaluations_taken]
    average_score_for_lesson = sum(all_scores_for_lesson) / len(all_scores_for_lesson) if all_scores_for_lesson else 0
    
    unique_student_ids_completed_lesson = db.session.query(Evaluation.user_id).filter_by(lesson_id=lesson.id).distinct().count()

    student_performance_data = []
    # Obtener todos los usuarios que han tomado esta lección
    # Esto se puede hacer consultando las evaluaciones para esta lección y obteniendo los user_id únicos
    evaluations_for_this_lesson = Evaluation.query.filter_by(lesson_id=lesson.id).all()
    student_ids_who_took_lesson = list(set([ev.user_id for ev in evaluations_for_this_lesson]))


    for student_id_val in student_ids_who_took_lesson:
        student_obj = User.query.get(student_id_val)
        if not student_obj:
            continue

        # Obtener todas las evaluaciones de ESTE estudiante para ESTA lección
        student_lesson_evals = [ev for ev in evaluations_for_this_lesson if ev.user_id == student_id_val]
        
        if student_lesson_evals:
            best_score_for_student = max(ev.score for ev in student_lesson_evals)
            attempts_count_for_student = len(student_lesson_evals)
            # Ordenar por timestamp para obtener el último intento
            last_attempt = sorted(student_lesson_evals, key=lambda ev: ev.timestamp, reverse=True)[0]
            
            student_performance_data.append({
                "student_id": student_obj.id,
                "nombres": student_obj.nombres,
                "apellidos": student_obj.apellidos,
                "correo": student_obj.correo,
                "best_score": best_score_for_student,
                "attempts_count": attempts_count_for_student,
                "last_attempt_date": last_attempt.timestamp.isoformat() if last_attempt else None
            })

    return jsonify({
        "lesson_id": lesson.id,
        "lesson_name": lesson.name,
        "total_attempts": total_attempts,
        "average_score": round(average_score_for_lesson, 2),
        "unique_students_completed": unique_student_ids_completed_lesson,
        "assigned_groups_count": lesson.assigned_student_groups.count(),
        "student_performance": sorted(student_performance_data, key=lambda x: (-(x.get('best_score', 0) or 0))) 
    })

# --- Funciones de Ayuda / Comandos para la Base de Datos ---
def create_tables():
    with app.app_context():
        db.create_all()
        print("Tablas creadas/actualizadas (incluyendo UserLessonCycle y UserQuestionSeen).")

def add_sample_data():
    with app.app_context():
        # Crear Admin
        admin_email = 'admin@example.com'; admin_password = 'adminpassword' 
        if not User.query.filter_by(correo=admin_email).first(): 
            admin_user = User(nombres="Admin", apellidos="Principal", edad=30, correo=admin_email, role='administrador'); 
            admin_user.set_password(admin_password); db.session.add(admin_user)
        
        # Crear Estudiantes
        student1 = User.query.filter_by(correo='estudiante1@example.com').first()
        if not student1:
            student1 = User(nombres="Ana", apellidos="Gómez", edad=20, correo='estudiante1@example.com', role='estudiante')
            student1.set_password('clave123'); db.session.add(student1)
        
        student2 = User.query.filter_by(correo='estudiante2@example.com').first()
        if not student2:
            student2 = User(nombres="Luis", apellidos="Martínez", edad=22, correo='estudiante2@example.com', role='estudiante')
            student2.set_password('clave456'); db.session.add(student2)
        
        student3 = User.query.filter_by(correo='estudiante3@example.com').first()
        if not student3:
            student3 = User(nombres="Sofia", apellidos="Paz", edad=21, correo='estudiante3@example.com', role='estudiante')
            student3.set_password('clave789'); db.session.add(student3)

        db.session.commit() # Commit usuarios

        # Crear Grupos de Preguntas
        qg_math_basic = QuestionGroup.query.filter_by(name="Matemáticas Básicas").first()
        if not qg_math_basic: qg_math_basic = QuestionGroup(name="Matemáticas Básicas"); db.session.add(qg_math_basic)
        
        qg_math_inter = QuestionGroup.query.filter_by(name="Matemáticas Intermedias").first()
        if not qg_math_inter: qg_math_inter = QuestionGroup(name="Matemáticas Intermedias"); db.session.add(qg_math_inter)

        qg_history_univ = QuestionGroup.query.filter_by(name="Historia Universal").first()
        if not qg_history_univ: qg_history_univ = QuestionGroup(name="Historia Universal"); db.session.add(qg_history_univ)
        
        db.session.commit() # Commit para obtener IDs de los grupos

        # Crear Preguntas
        math_questions_data = [
            {"g": qg_math_basic, "t": "2 + 2 = ?", "o": ["3", "4", "5", "6"], "c": 1, "p": "Suma simple."},
            {"g": qg_math_basic, "t": "5 * 3 = ?", "o": ["12", "15", "18", "20"], "c": 1, "p": "Multiplicación."},
            {"g": qg_math_basic, "t": "10 / 2 = ?", "o": ["3", "4", "5", "6"], "c": 2, "p": "División."},
            {"g": qg_math_basic, "t": "7 - 4 = ?", "o": ["1", "2", "3", "4"], "c": 2, "p": "Resta."},
            {"g": qg_math_basic, "t": "Raíz cuadrada de 9 = ?", "o": ["2", "3", "4", "81"], "c": 1, "p": "3x3=9."},
            {"g": qg_math_inter, "t": "Resolver para x: 2x + 3 = 11", "o": ["3", "4", "5", "6"], "c": 1, "p": "2x = 8, x = 4."},
            {"g": qg_math_inter, "t": "Área de un círculo con radio 5 (usar pi=3.14)?", "o": ["78.5", "31.4", "15.7", "25"], "c": 0, "p": "A = pi * r^2"},
        ]
        history_questions_data = [
            {"g": qg_history_univ, "t": "¿Quién descubrió América en 1492?", "o": ["Vasco da Gama", "Cristóbal Colón", "Fernando de Magallanes"], "c": 1, "p": "Colón llegó a América en 1492."},
            {"g": qg_history_univ, "t": "¿En qué año comenzó la Primera Guerra Mundial?", "o": ["1912", "1914", "1916", "1918"], "c": 1, "p": "La Primera Guerra Mundial comenzó en 1914."},
            {"g": qg_history_univ, "t": "¿Cuál fue la primera civilización mesopotámica?", "o": ["Egipcia", "Griega", "Sumeria", "Romana"], "c": 2, "p": "Los sumerios son considerados la primera civilización de Mesopotamia."},
        ]
        
        for q_list in [math_questions_data, history_questions_data]:
            for qd in q_list:
                if not Question.query.filter(Question.texto_pregunta.like(f"{qd['t'][:20]}%"), Question.question_group_id==qd["g"].id).first():
                    db.session.add(Question(texto_pregunta=qd["t"], opciones=json.dumps(qd["o"]), respuesta_correcta_indice=qd["c"], procedimiento_resolucion=qd["p"], question_group_id=qd["g"].id))
        db.session.commit()

        # Crear Grupos de Estudiantes
        sg_alpha = StudentGroup.query.filter_by(name="Grupo Alpha").first()
        if not sg_alpha: sg_alpha = StudentGroup(name="Grupo Alpha", description="Estudiantes iniciales"); db.session.add(sg_alpha)
        sg_beta = StudentGroup.query.filter_by(name="Grupo Beta").first()
        if not sg_beta: sg_beta = StudentGroup(name="Grupo Beta", description="Estudiantes avanzados"); db.session.add(sg_beta)
        db.session.commit()

        # Asignar estudiantes a grupos
        if student1 and sg_alpha and student1 not in sg_alpha.members: sg_alpha.members.append(student1)
        if student2 and sg_alpha and student2 not in sg_alpha.members: sg_alpha.members.append(student2)
        if student3 and sg_beta and student3 not in sg_beta.members: sg_beta.members.append(student3)
        db.session.commit()

        # Crear Lecciones
        lesson1 = Lesson.query.filter_by(name="Diagnóstico Matemático").first()
        if not lesson1 and qg_math_basic and qg_math_inter:
            lesson1 = Lesson(name="Diagnóstico Matemático", description="Evalúa conocimientos básicos e intermedios de matemáticas.")
            db.session.add(lesson1); db.session.flush()
            db.session.add(LessonConfiguration(lesson_id=lesson1.id, question_group_id=qg_math_basic.id, num_questions_to_select=3, time_per_question_seconds=60))
            db.session.add(LessonConfiguration(lesson_id=lesson1.id, question_group_id=qg_math_inter.id, num_questions_to_select=2, time_per_question_seconds=90))
            if sg_alpha: lesson1.assigned_student_groups.append(sg_alpha)
            if sg_beta: lesson1.assigned_student_groups.append(sg_beta) # Asignar también a Beta
        
        lesson2 = Lesson.query.filter_by(name="Cultura General Histórica").first()
        if not lesson2 and qg_history_univ:
            lesson2 = Lesson(name="Cultura General Histórica", description="Preguntas sobre historia universal.")
            db.session.add(lesson2); db.session.flush()
            db.session.add(LessonConfiguration(lesson_id=lesson2.id, question_group_id=qg_history_univ.id, num_questions_to_select=2, time_per_question_seconds=45))
            if sg_alpha: lesson2.assigned_student_groups.append(sg_alpha)

        db.session.commit()
        print("Proceso de añadir datos de ejemplo robustos finalizado.")


# --- Ejecución de la Aplicación ---
if __name__ == '__main__':
    with app.app_context():
        create_tables() 
        add_sample_data() # Comenta esto si no quieres que se ejecute cada vez que reinicias el servidor en desarrollo
    app.run(debug=True, port=5001, use_reloader=False) 
