# Reports

Every report reads the text of the active editor and opens its result as a new Markdown document. Your file is never changed and nothing is sent anywhere. The examples below come from the sample file (Open Sample File).

## Show Route Summary

Command: **Integration Route Atlas: Show Route Summary**

Shows whether the routes are XML or YAML, the number of routes, endpoints and components, and the number of endpoints per component (direct, kafka, http and so on).

Example (sample file):

> # Route Summary
>
> XML routes: 4 routes, 11 endpoints, 8 components.
>
> | Component | Endpoints |
> | --- | ---: |
> | direct | 4 |
> | bean | 1 |
> | exec | 1 |
> | file | 1 |
> | http | 1 |
> | seda | 1 |
> | sftp | 1 |
> | timer | 1 |

## Show Endpoints

Command: **Integration Route Atlas: Show Endpoints**

Lists every endpoint in route order with its line, the route it belongs to, its role (from, to, toD, wireTap, enrich, pollEnrich, inOnly, inOut), its component and its URI.

Example (sample file):

> # Endpoints
>
> | Line | Route | Role | Component | URI |
> | ---: | --- | --- | --- | --- |
> | 5 | orders-intake | from | file | file:inbox/orders?move=.done |
> | 7 | orders-intake | to | direct | direct:validate-order |
> | 8 | orders-intake | wireTap | seda | seda:order-audit |
> | 11 | validate-order | from | direct | direct:validate-order |
> | 13 | validate-order | to | bean | bean:orderValidator |
> | 14 | validate-order | to | direct | direct:rejected |
> | 16 | validate-order | to | http | http\:\/\/partner.example.test/api/orders?authUsername=shop\&authPassword=s3cret |
> | 19 | \(route 3\) | from | timer | timer:cleanup?period=3600000 |
> | 20 | \(route 3\) | to | exec | exec:/usr/local/bin/cleanup-tmp |
> | 23 | orders-intake | from | sftp | sftp\:\/\/ops@files.example.test/outgoing?password=\{\{sftp.password\}\} |
> | 24 | orders-intake | to | direct | direct:validate-order |

## Show Route Check

Command: **Integration Route Atlas: Show Route Check**

Finds routes without an id, route ids used twice, routes without a from endpoint or with more than one, endpoints without a URI, and direct, seda, vm and direct-vm endpoints that are sent to but consumed by no route in the file.

Example (sample file):

> # Route Check
>
> 4 problems found.
>
> | Line | Route | Problem |
> | ---: | --- | --- |
> | 8 | orders-intake | wireTap seda:order-audit: no route in this file consumes from it |
> | 14 | validate-order | to direct:rejected: no route in this file consumes from it |
> | 18 | \(route 3\) | the route has no id; give it one so logs, metrics and tracing name it |
> | 22 | orders-intake | route id orders-intake is also used on line 4 |

## Show Error Handling (Pro)

Command: **Integration Route Atlas: Show Error Handling** (Pro; part of the 14-day trial)

Lists every route with the error handling it defines itself (onException, errorHandler, doTry, doCatch, deadLetterChannel), says whether the file has global error handlers, and explains what happens to failures in routes without any.

Example (sample file):

> # Error Handling
>
> The file defines no global error handler.
>
> | Line | Route | Own error handling |
> | ---: | --- | --- |
> | 4 | orders-intake | no |
> | 10 | validate-order | yes (2) |
> | 18 | \(route 3\) | no |
> | 22 | orders-intake | no |
>
> 3 routes without any error handling: a failure goes to the default error handler, with no redelivery and no dead letter channel; the exception is logged and returned to the consumer.

## Show Security Review (Pro)

Command: **Integration Route Atlas: Show Security Review** (Pro; part of the 14-day trial)

Finds URI options such as password, authPassword, token or apiKey with a literal value instead of a property placeholder, URIs with user:password@, endpoints using http, ftp or telnet instead of their encrypted variants, and endpoints of the exec component, which runs operating system commands.

Example (sample file):

> # Security Review
>
> 3 findings.
>
> | Line | Route | Check | Finding |
> | ---: | --- | --- | --- |
> | 16 | validate-order | credentials_in_uri | option authPassword has a literal value; use a property placeholder such as \{\{name\}\} |
> | 16 | validate-order | plaintext_transport | http sends data unencrypted; use the TLS variant \(https, ftps or sftp\) |
> | 20 | \(route 3\) | exec_component | the exec component runs operating system commands |
