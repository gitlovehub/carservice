<?php

namespace Tests\Unit;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use App\Policies\AppointmentPolicy;
use App\Policies\QuotationPolicy;
use App\Policies\RepairOrderPolicy;
use App\Policies\VehiclePolicy;
use Tests\TestCase;

class AuthorizationPolicyTest extends TestCase
{
    public function test_customer_can_only_view_owned_appointments_and_vehicles(): void
    {
        $customerAccount = Account::factory()->make([
            'role' => Account::ROLE_CUSTOMER,
        ]);
        $customerAccount->setRelation('customer', $this->customer(10));

        $ownedAppointment = new Appointment(['customer_id' => 10]);
        $otherAppointment = new Appointment(['customer_id' => 20]);
        $ownedVehicle = new Vehicle(['customer_id' => 10]);
        $otherVehicle = new Vehicle(['customer_id' => 20]);

        $this->assertTrue((new AppointmentPolicy)->view($customerAccount, $ownedAppointment));
        $this->assertFalse((new AppointmentPolicy)->view($customerAccount, $otherAppointment));
        $this->assertTrue((new VehiclePolicy)->view($customerAccount, $ownedVehicle));
        $this->assertFalse((new VehiclePolicy)->view($customerAccount, $otherVehicle));
    }

    public function test_customer_can_only_view_and_respond_to_owned_repair_order_quotations(): void
    {
        $customerAccount = Account::factory()->make([
            'role' => Account::ROLE_CUSTOMER,
        ]);
        $customerAccount->setRelation('customer', $this->customer(10));

        $ownedRepairOrder = (new RepairOrder(['customer_id' => 10]))
            ->setRelation('customer', $this->customer(10));
        $otherRepairOrder = (new RepairOrder(['customer_id' => 20]))
            ->setRelation('customer', $this->customer(20));
        $ownedQuotation = (new Quotation)
            ->setRelation('repairOrder', $ownedRepairOrder);
        $otherQuotation = (new Quotation)
            ->setRelation('repairOrder', $otherRepairOrder);

        $quotationPolicy = new QuotationPolicy;
        $repairOrderPolicy = new RepairOrderPolicy;

        $this->assertTrue($repairOrderPolicy->view($customerAccount, $ownedRepairOrder));
        $this->assertFalse($repairOrderPolicy->view($customerAccount, $otherRepairOrder));
        $this->assertTrue($quotationPolicy->view($customerAccount, $ownedQuotation));
        $this->assertTrue($quotationPolicy->respond($customerAccount, $ownedQuotation));
        $this->assertFalse($quotationPolicy->view($customerAccount, $otherQuotation));
        $this->assertFalse($quotationPolicy->respond($customerAccount, $otherQuotation));
    }

    public function test_approved_quotation_cannot_be_updated_by_an_advisor(): void
    {
        $advisor = Account::factory()->make([
            'role' => Account::ROLE_ADVISOR,
        ]);
        $quotation = new Quotation([
            'status' => Quotation::APPROVED,
        ]);

        $this->assertFalse((new QuotationPolicy)->update($advisor, $quotation));
    }

    private function customer(int $id): Customer
    {
        $customer = new Customer;
        $customer->setRawAttributes(['id' => $id]);

        return $customer;
    }
}
