from datetime import datetime, timedelta

from flask_jwt_extended import create_access_token
from sqlalchemy import text

from models import db
from models.user import User, PasswordResetToken
from models.workout import Workout, WorkoutExercise, ExerciseSet, Routine
from models.classes import Class, ClassMembership, ClassJoinRequest, AssignedWorkout, StudentWorkoutLog
from models.macros import MacroGoal, Meal, DailyIntake


def _user(email, username):
    user = User(email=email, username=username)
    db.session.add(user)
    db.session.flush()
    return user


def _workout(user):
    workout = Workout(user_id=user.id, name='Leg day')
    db.session.add(workout)
    db.session.flush()
    exercise = WorkoutExercise(workout_id=workout.id)
    db.session.add(exercise)
    db.session.flush()
    db.session.add(ExerciseSet(workout_exercise_id=exercise.id, set_number=1))
    return workout


def _class(instructor, code):
    class_ = Class(instructor_id=instructor.id, name='Bootcamp', join_code=code)
    db.session.add(class_)
    db.session.flush()
    assignment = AssignedWorkout(class_id=class_.id, instructor_id=instructor.id, name='WOD')
    db.session.add(assignment)
    db.session.flush()
    return class_, assignment


def test_delete_account_removes_everything_the_user_owns(client):
    doomed = _user('doomed@example.com', 'doomed')
    other = _user('other@example.com', 'other')

    # The doomed user teaches a class that `other` belongs to and has logged against.
    own_class, own_assignment = _class(doomed, 'DOOMED01')
    db.session.add(ClassMembership(class_id=own_class.id, student_id=other.id))
    db.session.add(StudentWorkoutLog(assigned_workout_id=own_assignment.id, student_id=other.id,
                                     workout_id=_workout(other).id))

    # The doomed user is also a student in `other`'s class.
    other_class, other_assignment = _class(other, 'OTHER001')
    db.session.add(ClassMembership(class_id=other_class.id, student_id=doomed.id))
    db.session.add(ClassJoinRequest(class_id=other_class.id, student_id=doomed.id))
    db.session.add(StudentWorkoutLog(assigned_workout_id=other_assignment.id, student_id=doomed.id,
                                     workout_id=_workout(doomed).id))

    db.session.add(Routine(user_id=doomed.id, name='Push'))
    db.session.add(MacroGoal(user_id=doomed.id))
    db.session.add(Meal(user_id=doomed.id, meal_type='lunch', name='Rice'))
    db.session.add(DailyIntake(user_id=doomed.id))
    db.session.add(PasswordResetToken(user_id=doomed.id, token='t',
                                      expires_at=datetime.utcnow() + timedelta(hours=1)))
    db.session.commit()
    doomed_id, other_id = doomed.id, other.id
    token = create_access_token(identity=str(doomed_id))

    res = client.delete('/api/auth/me', headers={'Authorization': f'Bearer {token}'})

    assert res.status_code == 200
    assert db.session.get(User, doomed_id) is None
    assert Class.query.filter_by(instructor_id=doomed_id).count() == 0
    for model in (ClassMembership, ClassJoinRequest, StudentWorkoutLog):
        assert model.query.filter_by(student_id=doomed_id).count() == 0
    for model in (Workout, Routine, MacroGoal, Meal, DailyIntake, PasswordResetToken):
        assert model.query.filter_by(user_id=doomed_id).count() == 0
    # No row anywhere still points at a deleted parent.
    assert db.session.execute(text('PRAGMA foreign_key_check')).fetchall() == []

    # The other user keeps their own account, class, and workouts.
    assert db.session.get(User, other_id) is not None
    assert Class.query.filter_by(instructor_id=other_id).count() == 1
    assert Workout.query.filter_by(user_id=other_id).count() == 1

    # The token for the deleted account no longer works.
    assert client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'}).status_code == 404


def test_delete_account_requires_auth(client):
    assert client.delete('/api/auth/me').status_code == 401
