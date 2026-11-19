# Khaosan Restaurant Reservations

A mobile-friendly restaurant booking and table management project by **Raihan Mahin**, built with **Lovable**. Guests can find a time and reserve a table, while staff have tools to manage reservations and table status.

**[Open the website](https://khaosan.lovable.app)**

## Project purpose

This project explores both sides of the restaurant experience: a simple booking journey for guests and an operational view for staff. It turns a service idea into an interactive product that connects customer convenience with table availability and restaurant workflows.

## Guest experience

- Choose a date, party size and available time.
- Follow a three-step booking journey: visit details, guest details and confirmation.
- Temporarily hold a time while completing the booking.
- Manage a reservation through a private link, including cancellation or rescheduling.
- View current table availability through a floor plan or list.
- Join a waitlist when a suitable table is unavailable.

## Staff tools

- View reservations, the floor plan, a timeline and the waitlist.
- Manage walk-ins, arrivals, seating, departures and table cleaning.
- Block tables and adjust restaurant settings.

## How it was built

I used Lovable for AI-assisted development, providing the product brief and directing the guest journey, operational requirements and interface through prompts. Lovable generated and iterated the application code.

Booking and availability rules are handled in Postgres functions, called through Supabase. Public availability views are separated from staff-only guest information. The repository contains the application code and is connected to Lovable through GitHub sync.

## Current setup

The current hours, floor plan and policies are demonstration settings. Venue details need to be confirmed before operational use. Email and SMS booking confirmations are not connected.
