from app.database import SessionLocal
from app.models import Project, Requirement


DOMAINS = {
    "Library Management": [
        "Library Management System",
        "Digital Library Platform",
        "University Library Portal",
        "Book Reservation System",
        "Library Administration System",
    ],

    "Healthcare": [
        "Hospital Management System",
        "Patient Record System",
        "Medical Appointment System",
        "Healthcare Portal",
        "Prescription Management System",
    ],

    "E-commerce": [
        "Online Shopping System",
        "Marketplace Platform",
        "Order Management System",
        "Payment Processing System",
        "Customer Service Portal",
    ],

    "Security": [
        "Authentication System",
        "Access Control Platform",
        "Identity Management System",
        "Security Monitoring System",
        "Audit Logging System",
    ],

    "Fleet Management": [
        "Vehicle Tracking System",
        "Transport Management System",
        "Fleet Monitoring System",
        "Driver Management System",
        "Maintenance Management System",
    ]
}


REQUIREMENTS = [
    "The system shall allow users to login using email and password.",
    "The system shall allow users to search records.",
    "The system shall generate reports for authorized users.",
    "The system shall store information securely.",
    "The system shall allow administrators to manage roles.",
    "The system shall send notifications.",
    "The system shall maintain activity history.",
    "The system shall validate user input.",
    "The system shall allow users to update information.",
    "The system should respond quickly during normal operation."
]


def seed_database():

    db = SessionLocal()

    try:

        existing = db.query(Project).count()

        if existing > 0:
            print("Database already seeded.")
            return


        print("Creating default evaluation projects...")


        for domain, projects in DOMAINS.items():

            for project_name in projects:

                project = Project(
                    name=project_name,
                    description=f"{domain} evaluation project",
                    domain_system_type=domain
                )

                db.add(project)
                db.commit()
                db.refresh(project)


                for req in REQUIREMENTS:

                    requirement = Requirement(
                        project_id=project.id,
                        requirement_text=req,
                        source_type="evaluation"
                    )

                    db.add(requirement)

                db.commit()


        print("Database seeding completed.")


    finally:
        db.close()