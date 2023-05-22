---
created: 2023-05-22
---

# Admin API design

**registration**

`POST /admin/registration` (Registration[])
— Set all registrations at once, e.g. from a Notion job

`POST /admin/registration/append` (Registration)
— Append a registration, like the MozFest ti.to job does

**schedule**

e.g. from a notion or pretalx job to update everything at once

`POST /admin/schedule` ({ sessions, taxonomies, speakers, slots })
— Set the entire schedule all in one go
