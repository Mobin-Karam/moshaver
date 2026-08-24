#!/bin/bash


echo "Validating architecture audit output..."


ERROR=0


check_folder(){

if [ ! -d "$1" ]; then
    echo "Missing: $1"
    ERROR=1
else
    echo "Found: $1"
fi

}


check_file(){

if [ ! -f "$1" ]; then
    echo "Missing: $1"
    ERROR=1
else
    echo "Found: $1"
fi

}



check_folder "docs/audit/database"
check_folder "docs/audit/backend"
check_folder "docs/audit/frontend"
check_folder "docs/audit/security"
check_folder "docs/audit/ux"


check_folder "docs/ai-context"


if [ $ERROR -eq 0 ]; then


cat > docs/audit/AUDIT-COMPLETE.md <<EOF

# Architecture Audit Completed

Status: Complete

Generated folders:

- Database
- Backend
- Frontend
- Security
- UX

AI Context:

Available

EOF


echo "Audit completed successfully."

else

echo "Audit incomplete. Missing required outputs."

exit 1

fi
