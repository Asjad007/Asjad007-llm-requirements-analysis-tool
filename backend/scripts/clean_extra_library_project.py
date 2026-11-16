from app.database import SessionLocal
from app.models import Project, Requirement, AnalysisResult, UserReview


EXTRA_PROJECT_NAME = "Evaluation_Project_Library_System"


def main():
    db = SessionLocal()

    try:
        project = (
            db.query(Project)
            .filter(Project.name == EXTRA_PROJECT_NAME)
            .first()
        )

        if not project:
            print("Extra project not found. Nothing deleted.")
            return

        requirements = (
            db.query(Requirement)
            .filter(Requirement.project_id == project.id)
            .all()
        )

        requirement_ids = [r.id for r in requirements]

        analyses = (
            db.query(AnalysisResult)
            .filter(AnalysisResult.requirement_id.in_(requirement_ids))
            .all()
        )

        analysis_ids = [a.id for a in analyses]

        reviews_deleted = 0
        analyses_deleted = 0
        requirements_deleted = 0

        if analysis_ids:
            reviews_deleted = (
                db.query(UserReview)
                .filter(UserReview.analysis_result_id.in_(analysis_ids))
                .delete(synchronize_session=False)
            )

            analyses_deleted = (
                db.query(AnalysisResult)
                .filter(AnalysisResult.id.in_(analysis_ids))
                .delete(synchronize_session=False)
            )

        if requirement_ids:
            requirements_deleted = (
                db.query(Requirement)
                .filter(Requirement.id.in_(requirement_ids))
                .delete(synchronize_session=False)
            )

        db.delete(project)
        db.commit()

        print("Deleted extra project:", EXTRA_PROJECT_NAME)
        print("Reviews deleted:", reviews_deleted)
        print("Analyses deleted:", analyses_deleted)
        print("Requirements deleted:", requirements_deleted)

        print("--------------------------------")
        print("Final database counts:")
        print("Projects:", db.query(Project).count())
        print("Requirements:", db.query(Requirement).count())
        print("Analyses:", db.query(AnalysisResult).count())
        print("Reviews:", db.query(UserReview).count())
        print("--------------------------------")

    except Exception as error:
        db.rollback()
        print("ERROR:")
        print(error)

    finally:
        db.close()


if __name__ == "__main__":
    main()